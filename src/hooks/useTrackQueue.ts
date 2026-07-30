import { useCallback, useEffect, useRef, useState } from 'react'
import { decodeAudioFile, estimateTempo } from '../lib/audio'
import { defaultBarAlignedTransition, snapTransitionRange } from '../lib/beatGrid'
import { fileKey, isAudioFile } from '../lib/files'
import { createLimiter } from '../lib/limiter'
import { readTrackTags, titleFromFileName, UNKNOWN_ARTIST, UNKNOWN_GENRE } from '../lib/metadata'
import { moveItem } from '../lib/reorder'
import {
  defaultDropInRange,
  defaultTransitionRange,
  validateDropInRange,
  validateTransitionRange,
} from '../lib/timeInput'
import { computeWaveformPeaks } from '../lib/waveform'
import type { Track } from '../types'

const ANALYSIS_CONCURRENCY = 2

const runAnalysisTask = createLimiter(ANALYSIS_CONCURRENCY)

export interface AddFilesResult {
  added: number
  /** Files skipped because they are not audio. */
  rejected: number
  /** Files skipped because the same file is already queued. */
  duplicates: number
}

export interface WindowUpdateResult {
  errors: string[]
  range: { startSeconds: number; endSeconds: number }
}

/** @deprecated Prefer `WindowUpdateResult`. */
export type TransitionUpdateResult = WindowUpdateResult

let sequence = 0

function createId(): string {
  sequence += 1
  return `track-${sequence}`
}

function toQueuedTrack(file: File): Track {
  return {
    id: createId(),
    file,
    title: titleFromFileName(file.name),
    artist: UNKNOWN_ARTIST,
    genre: UNKNOWN_GENRE,
    camelotKey: null,
    rawKey: null,
    bpm: null,
    beatOffsetSeconds: null,
    durationSeconds: null,
    transitionStartSeconds: null,
    transitionEndSeconds: null,
    dropInStartSeconds: null,
    dropInEndSeconds: null,
    waveformPeaks: null,
    status: 'queued',
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Analysis failed'
}

export function useTrackQueue() {
  const [tracks, setTracks] = useState<Track[]>([])
  // Mirrors `tracks` so event handlers can read and update the queue without
  // running dedupe or kicking off analysis from inside a state updater.
  const tracksRef = useRef<Track[]>([])
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const commit = useCallback((update: (current: Track[]) => Track[]) => {
    const next = update(tracksRef.current)
    tracksRef.current = next
    setTracks(next)
  }, [])

  /** Applies changes only while the track is still queued, so removals win any race. */
  const patchTrack = useCallback(
    (id: string, changes: Partial<Track>) => {
      if (!isMounted.current) {
        return
      }

      commit((current) =>
        current.some((track) => track.id === id)
          ? current.map((track) => (track.id === id ? { ...track, ...changes } : track))
          : current,
      )
    },
    [commit],
  )

  const analyzeTrack = useCallback(
    async (id: string, file: File) => {
      patchTrack(id, { status: 'analyzing' })

      // Tags land first so the table fills in while beat detection runs.
      patchTrack(id, await readTrackTags(file))

      try {
        const audioBuffer = await decodeAudioFile(file)
        const durationSeconds = audioBuffer.duration
        // Free-time placeholders until BPM/offset arrive; transition is replaced
        // with last-8-bars once the grid is known.
        const placeholder = defaultTransitionRange(durationSeconds)
        const dropIn = defaultDropInRange(durationSeconds)

        patchTrack(id, {
          durationSeconds,
          waveformPeaks: computeWaveformPeaks(audioBuffer),
          transitionStartSeconds: placeholder.startSeconds,
          transitionEndSeconds: placeholder.endSeconds,
          dropInStartSeconds: dropIn.startSeconds,
          dropInEndSeconds: dropIn.endSeconds,
        })

        const { bpm, offsetSeconds } = await estimateTempo(audioBuffer)
        const transition =
          defaultBarAlignedTransition(durationSeconds, bpm, offsetSeconds) ?? placeholder

        patchTrack(id, {
          bpm,
          beatOffsetSeconds: offsetSeconds,
          transitionStartSeconds: transition.startSeconds,
          transitionEndSeconds: transition.endSeconds,
          status: 'ready',
          errorMessage: undefined,
        })
      } catch (error) {
        // Decode may have succeeded while tempo failed — keep duration/peaks and
        // free-time transitions; only BPM/offset stay unset.
        const current = tracksRef.current.find((track) => track.id === id)
        if (current?.durationSeconds !== null && current?.durationSeconds !== undefined) {
          patchTrack(id, {
            status: 'failed',
            bpm: null,
            beatOffsetSeconds: null,
            errorMessage: errorMessage(error),
          })
        } else {
          patchTrack(id, { status: 'failed', errorMessage: errorMessage(error) })
        }
      }
    },
    [patchTrack],
  )

  const addFiles = useCallback(
    (incoming: File[]): AddFilesResult => {
      const audioFiles = incoming.filter(isAudioFile)
      const seen = new Set(tracksRef.current.map((track) => fileKey(track.file)))
      const accepted: File[] = []

      for (const file of audioFiles) {
        const key = fileKey(file)
        if (!seen.has(key)) {
          seen.add(key)
          accepted.push(file)
        }
      }

      if (accepted.length > 0) {
        const queued = accepted.map(toQueuedTrack)
        commit((current) => [...current, ...queued])

        for (const track of queued) {
          void runAnalysisTask(() => analyzeTrack(track.id, track.file))
        }
      }

      return {
        added: accepted.length,
        rejected: incoming.length - audioFiles.length,
        duplicates: audioFiles.length - accepted.length,
      }
    },
    [analyzeTrack, commit],
  )

  const moveTrack = useCallback(
    (id: string, offset: number) => {
      commit((current) => {
        const index = current.findIndex((track) => track.id === id)
        return index === -1 ? current : moveItem(current, index, index + offset)
      })
    },
    [commit],
  )

  const removeTrack = useCallback(
    (id: string) => {
      commit((current) => current.filter((track) => track.id !== id))
    },
    [commit],
  )

  const clearTracks = useCallback(() => commit(() => []), [commit])

  const updateTransition = useCallback(
    (id: string, startSeconds: number, endSeconds: number): WindowUpdateResult => {
      const track = tracksRef.current.find((entry) => entry.id === id)
      if (!track) {
        return {
          errors: ['Track not found'],
          range: { startSeconds, endSeconds },
        }
      }

      const { range: validated, errors } = validateTransitionRange(
        startSeconds,
        endSeconds,
        track.durationSeconds,
      )

      let range = validated
      if (
        track.durationSeconds !== null &&
        track.bpm !== null &&
        track.beatOffsetSeconds !== null
      ) {
        range = snapTransitionRange(
          validated.startSeconds,
          validated.endSeconds,
          track.bpm,
          track.beatOffsetSeconds,
          track.durationSeconds,
        )
      }

      patchTrack(id, {
        transitionStartSeconds: range.startSeconds,
        transitionEndSeconds: range.endSeconds,
      })

      return { errors, range }
    },
    [patchTrack],
  )

  const updateDropIn = useCallback(
    (id: string, startSeconds: number, endSeconds: number): WindowUpdateResult => {
      const track = tracksRef.current.find((entry) => entry.id === id)
      if (!track) {
        return {
          errors: ['Track not found'],
          range: { startSeconds, endSeconds },
        }
      }

      const { range: validated, errors } = validateDropInRange(
        startSeconds,
        endSeconds,
        track.durationSeconds,
      )

      let range = validated
      if (
        track.durationSeconds !== null &&
        track.bpm !== null &&
        track.beatOffsetSeconds !== null
      ) {
        range = snapTransitionRange(
          validated.startSeconds,
          validated.endSeconds,
          track.bpm,
          track.beatOffsetSeconds,
          track.durationSeconds,
        )
      }

      patchTrack(id, {
        dropInStartSeconds: range.startSeconds,
        dropInEndSeconds: range.endSeconds,
      })

      return { errors, range }
    },
    [patchTrack],
  )

  return { tracks, addFiles, moveTrack, removeTrack, clearTracks, updateTransition, updateDropIn }
}
