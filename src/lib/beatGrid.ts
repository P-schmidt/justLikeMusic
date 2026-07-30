import type { TransitionRange } from './timeInput'

/** Hip-hop / soul default — 4/4. */
export const BEATS_PER_BAR = 4
/** Default mix-out length once a beat grid is known. */
export const DEFAULT_MIXOUT_BARS = 8

export interface BeatGrid {
  bpm: number
  /** Time of the first detected beat (phase), in seconds. */
  offsetSeconds: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function beatIntervalSeconds(bpm: number): number {
  return 60 / bpm
}

export function barIntervalSeconds(bpm: number, beatsPerBar = BEATS_PER_BAR): number {
  return beatIntervalSeconds(bpm) * beatsPerBar
}

/**
 * Yields every beat time in `[0, duration]` on the grid defined by BPM + offset.
 * Beats before 0 are skipped; the phase still determines where they land.
 */
export function* iterateBeats(
  bpm: number,
  offsetSeconds: number,
  durationSeconds: number,
): Generator<number> {
  if (!(bpm > 0) || !(durationSeconds > 0)) {
    return
  }

  const step = beatIntervalSeconds(bpm)
  // Project the detected beat phase into the first beat at or after 0.
  let beat = offsetSeconds % step
  if (beat < 0) {
    beat += step
  }

  for (; beat <= durationSeconds + 1e-9; beat += step) {
    yield beat
  }
}

/** Bar-start times — every `beatsPerBar`-th beat on the grid. */
export function* iterateBars(
  bpm: number,
  offsetSeconds: number,
  durationSeconds: number,
  beatsPerBar = BEATS_PER_BAR,
): Generator<number> {
  let index = 0
  for (const beat of iterateBeats(bpm, offsetSeconds, durationSeconds)) {
    if (index % beatsPerBar === 0) {
      yield beat
    }
    index += 1
  }
}

export function listBars(
  bpm: number,
  offsetSeconds: number,
  durationSeconds: number,
  beatsPerBar = BEATS_PER_BAR,
): number[] {
  return [...iterateBars(bpm, offsetSeconds, durationSeconds, beatsPerBar)]
}

/**
 * Snaps `time` to the nearest bar boundary inside `[0, duration]`.
 * Falls back to clamping when the grid is empty (degenerate BPM / duration).
 */
export function snapToNearestBar(
  time: number,
  bpm: number,
  offsetSeconds: number,
  durationSeconds: number,
  beatsPerBar = BEATS_PER_BAR,
): number {
  const clamped = clamp(time, 0, durationSeconds)
  const bars = listBars(bpm, offsetSeconds, durationSeconds, beatsPerBar)

  if (bars.length === 0) {
    return clamped
  }

  let best = bars[0]
  let bestDistance = Math.abs(clamped - best)

  for (const bar of bars) {
    const distance = Math.abs(clamped - bar)
    if (distance < bestDistance) {
      best = bar
      bestDistance = distance
    }
  }

  // Also consider duration itself when it is very close to a bar past the end —
  // we never snap past the track length.
  return clamp(best, 0, durationSeconds)
}

/**
 * Snaps both ends of a transition onto bar boundaries and keeps start &lt; end.
 * If they collapse onto the same bar, the end is pushed one bar later (or the
 * start one bar earlier) when the track still has room.
 */
export function snapTransitionRange(
  startSeconds: number,
  endSeconds: number,
  bpm: number,
  offsetSeconds: number,
  durationSeconds: number,
  beatsPerBar = BEATS_PER_BAR,
): TransitionRange {
  const interval = barIntervalSeconds(bpm, beatsPerBar)
  let start = snapToNearestBar(startSeconds, bpm, offsetSeconds, durationSeconds, beatsPerBar)
  let end = snapToNearestBar(endSeconds, bpm, offsetSeconds, durationSeconds, beatsPerBar)

  if (start < end) {
    return { startSeconds: start, endSeconds: end }
  }

  // Collapsed or inverted — prefer extending the end when there is room.
  const extendedEnd = start + interval
  if (extendedEnd <= durationSeconds + 1e-9) {
    end = snapToNearestBar(extendedEnd, bpm, offsetSeconds, durationSeconds, beatsPerBar)
    if (end > start) {
      return { startSeconds: start, endSeconds: end }
    }
  }

  const pulledStart = end - interval
  if (pulledStart >= 0) {
    start = snapToNearestBar(pulledStart, bpm, offsetSeconds, durationSeconds, beatsPerBar)
    if (start < end) {
      return { startSeconds: start, endSeconds: end }
    }
  }

  // Last resort: keep a tiny valid window at the snapped end.
  return {
    startSeconds: Math.max(0, end - interval),
    endSeconds: end,
  }
}

/**
 * Default mix-out: the last `barCount` bars on the grid (fewer when the track is
 * shorter). Falls back to `null` when a grid cannot be built so callers can use
 * free-time defaults instead.
 */
export function defaultBarAlignedTransition(
  durationSeconds: number,
  bpm: number,
  offsetSeconds: number,
  barCount = DEFAULT_MIXOUT_BARS,
  beatsPerBar = BEATS_PER_BAR,
): TransitionRange | null {
  if (!(bpm > 0) || !(durationSeconds > 0)) {
    return null
  }

  const bars = listBars(bpm, offsetSeconds, durationSeconds, beatsPerBar)
  if (bars.length < 2) {
    return null
  }

  const interval = barIntervalSeconds(bpm, beatsPerBar)
  const end = bars[bars.length - 1]
  const startIndex = Math.max(0, bars.length - 1 - barCount)
  let start = bars[startIndex]

  // Prefer a full N-bar span when the last bar sits near the track end.
  if (bars.length - 1 - startIndex < barCount) {
    start = Math.max(0, end - barCount * interval)
    start = snapToNearestBar(start, bpm, offsetSeconds, durationSeconds, beatsPerBar)
  }

  if (start >= end) {
    start = Math.max(0, end - interval)
  }

  return snapTransitionRange(start, end, bpm, offsetSeconds, durationSeconds, beatsPerBar)
}
