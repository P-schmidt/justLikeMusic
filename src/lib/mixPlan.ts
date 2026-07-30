import type { Track } from '../types'

export interface MixSegment {
  index: number
  trackId: string
  title: string
  /** Position on the master timeline where this track's `localStart` begins. */
  startTime: number
  /** Local time at which this track begins playing (drop-in cue). */
  localStart: number
  /** Local time at which this track stops playing. */
  localEnd: number
  /** Local time where the fade-out begins, or `null` for the final track. */
  fadeOutStart: number | null
  /** Local time where the fade-out completes, or `null` for the final track. */
  fadeOutEnd: number | null
  /** Length of this track's fade-in from `localStart`; 0 for the first track. */
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

/** How long this segment occupies on the master timeline. */
export function segmentSpan(segment: Pick<MixSegment, 'localStart' | 'localEnd'>): number {
  return Math.max(0, segment.localEnd - segment.localStart)
}

/**
 * Lays the queue out on one continuous timeline.
 *
 * Track N + 1 starts from its drop-in cue the moment track N reaches its
 * transition start, so the gap between consecutive start times is the outgoing
 * track's remaining body (`transitionStart − localStart`). Each track fades in
 * over its own drop-in window and fades out over its transition window.
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

  playable.forEach((track, index) => {
    const durationSeconds = track.durationSeconds as number
    const isFirst = index === 0
    const isLast = index === playable.length - 1

    const dropInStart = clamp(track.dropInStartSeconds ?? 0, 0, durationSeconds)
    const dropInEnd = clamp(track.dropInEndSeconds ?? dropInStart, dropInStart, durationSeconds)
    const transitionStart = clamp(track.transitionStartSeconds ?? durationSeconds, 0, durationSeconds)
    const transitionEnd = clamp(track.transitionEndSeconds ?? durationSeconds, transitionStart, durationSeconds)

    // Playback must begin at or before the mix-out; otherwise there is no body.
    const localStart = Math.min(dropInStart, isLast ? durationSeconds : transitionStart)
    const localEnd = isLast ? durationSeconds : Math.max(transitionEnd, localStart)
    const fadeOutStart = isLast ? null : Math.max(transitionStart, localStart)
    const fadeOutEnd = isLast ? null : Math.max(transitionEnd, localStart)

    // Opening track stays at full volume; later tracks fade in over their drop-in
    // window, capped so the rise finishes before this track starts fading out.
    const rawFadeIn = isFirst ? 0 : Math.max(0, dropInEnd - dropInStart)
    const fadeInLimit = isLast ? durationSeconds - localStart : Math.max(0, (fadeOutStart ?? localStart) - localStart)

    segments.push({
      index,
      trackId: track.id,
      title: track.title,
      startTime: cursor,
      localStart,
      localEnd,
      fadeOutStart,
      fadeOutEnd,
      fadeInDuration: Math.min(rawFadeIn, fadeInLimit),
      durationSeconds,
    })

    cursor += isLast ? durationSeconds - localStart : Math.max(0, transitionStart - localStart)
  })

  const last = segments[segments.length - 1]

  return { segments, totalDuration: last.startTime + segmentSpan(last) }
}

/** Segments audible at a given master position, in play order. */
export function segmentsAt(plan: MixPlan, position: number): MixSegment[] {
  return plan.segments.filter(
    (segment) => position >= segment.startTime && position < segment.startTime + segmentSpan(segment),
  )
}

export function segmentSignature(segment: MixSegment): string {
  return [
    segment.index,
    segment.trackId,
    segment.startTime,
    segment.localStart,
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
