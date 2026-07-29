import { useCallback, useEffect, useRef, useState } from 'react'
import { decodeAudioFile, estimateBpm } from '../lib/audio'
import { fileKey, isAudioFile } from '../lib/files'
import { createLimiter } from '../lib/limiter'
import { readTrackTags, titleFromFileName, UNKNOWN_ARTIST, UNKNOWN_GENRE } from '../lib/metadata'
import { moveItem } from '../lib/reorder'
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
    bpm: null,
    durationSeconds: null,
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
        patchTrack(id, { durationSeconds: audioBuffer.duration })

        const bpm = await estimateBpm(audioBuffer)
        patchTrack(id, { bpm, status: 'ready', errorMessage: undefined })
      } catch (error) {
        patchTrack(id, { status: 'failed', errorMessage: errorMessage(error) })
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

  return { tracks, addFiles, moveTrack, removeTrack, clearTracks }
}
