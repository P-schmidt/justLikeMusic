import type { Track } from '../types'

export interface MixSegment {
  index: number
  trackId: string
  title: string
  /** Position on the master timeline holding this track's local time 0. */
  startTime: number
  /** Local time at which this track stops playing. */
  localEnd: number
  /** Local time where the fade-out begins, or `null` for the final track. */
  fadeOutStart: number | null
  /** Local time where the fade-out completes, or `null` for the final track. */
  fadeOutEnd: number | null
  /** Length of this track's fade-in; 0 for the first track. */
  fadeInDuration: number
  durationSeconds: number
}

export interface MixPlan {
  segments: MixSegment[]
  totalDuration: number
}

export const EMPTY_MIX_PLAN: MixPlan = { segments: [], totalDuration: 0 }

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Lays the queue out on one continuous timeline.
 *
 * Track N + 1 starts from its own 00:00 the moment track N reaches its transition
 * start, so the gap between consecutive start times is the outgoing track's
 * transition start, and the two overlap until its transition end.
 */
export function buildMixPlan(tracks: Track[]): MixPlan {
  const playable = tracks.filter(
    (track) => track.durationSeconds !== null && Number.isFinite(track.durationSeconds) && track.durationSeconds > 0,
  )

  if (playable.length === 0) {
    return EMPTY_MIX_PLAN
  }

  const segments: MixSegment[] = []
  let cursor = 0
  let incomingFade = 0

  playable.forEach((track, index) => {
    const durationSeconds = track.durationSeconds as number
    const isLast = index === playable.length - 1

    const transitionStart = clamp(track.transitionStartSeconds ?? durationSeconds, 0, durationSeconds)
    const transitionEnd = clamp(track.transitionEndSeconds ?? durationSeconds, transitionStart, durationSeconds)

    segments.push({
      index,
      trackId: track.id,
      title: track.title,
      startTime: cursor,
      localEnd: isLast ? durationSeconds : transitionEnd,
      fadeOutStart: isLast ? null : transitionStart,
      fadeOutEnd: isLast ? null : transitionEnd,
      // A fade-in must finish before this track starts fading out again, which
      // only bites when the previous overlap is longer than this track's intro.
      fadeInDuration: Math.min(incomingFade, isLast ? durationSeconds : transitionStart),
      durationSeconds,
    })

    cursor += isLast ? durationSeconds : transitionStart
    incomingFade = isLast ? 0 : transitionEnd - transitionStart
  })

  const last = segments[segments.length - 1]

  return { segments, totalDuration: last.startTime + last.durationSeconds }
}

/** Segments audible at a given master position, in play order. */
export function segmentsAt(plan: MixPlan, position: number): MixSegment[] {
  return plan.segments.filter(
    (segment) => position >= segment.startTime && position < segment.startTime + segment.localEnd,
  )
}

export function segmentSignature(segment: MixSegment): string {
  return [
    segment.index,
    segment.trackId,
    segment.startTime,
    segment.localEnd,
    segment.fadeOutStart,
    segment.fadeOutEnd,
    segment.fadeInDuration,
    segment.durationSeconds,
  ].join('|')
}

/**
 * Index of the first segment that differs between two plans, or `null` when they
 * describe the same mix. Lets the engine keep already-playing sources alive when
 * an edit only affects later parts of the set.
 */
export function firstChangedIndex(before: MixSegment[], after: MixSegment[]): number | null {
  const shared = Math.min(before.length, after.length)

  for (let index = 0; index < shared; index += 1) {
    if (segmentSignature(before[index]) !== segmentSignature(after[index])) {
      return index
    }
  }

  return before.length === after.length ? null : shared
}
