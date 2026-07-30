export interface TimeRange {
  startSeconds: number
  endSeconds: number
}

/** @deprecated Prefer `TimeRange` — kept as an alias for existing call sites. */
export type TransitionRange = TimeRange

export interface TimeRangeValidation {
  range: TimeRange
  /** Non-empty when the submitted values were clamped or rejected in part. */
  errors: string[]
}

/** @deprecated Prefer `TimeRangeValidation`. */
export type TransitionValidation = TimeRangeValidation

/** Whole seconds or one decimal: `1:30`, `1:30.5`, `0:04.2`. */
const TIME_PATTERN = /^(\d+):([0-5]?\d)(?:\.(\d))?$/

/** Parses `M:SS` or `M:SS.d` into seconds. Returns `null` when invalid. */
export function parseTimeInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const match = TIME_PATTERN.exec(trimmed)
  if (!match) {
    return null
  }

  const minutes = Number(match[1])
  const seconds = Number(match[2])
  const tenths = match[3] !== undefined ? Number(match[3]) : 0

  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60) {
    return null
  }

  return minutes * 60 + seconds + tenths / 10
}

/**
 * Formats seconds as `M:SS.d` so bar-snapped times that fall between whole
 * seconds stay visible in the inputs.
 */
export function formatTimeInput(seconds: number): string {
  const totalTenths = Math.max(0, Math.round(seconds * 10))
  const minutes = Math.floor(totalTenths / 600)
  const remainderTenths = totalTenths % 600
  const wholeSeconds = Math.floor(remainderTenths / 10)
  const tenths = remainderTenths % 10

  return `${minutes}:${String(wholeSeconds).padStart(2, '0')}.${tenths}`
}

/**
 * Keeps a time window inside `[0, duration]` with start ≤ end. Values above
 * the track length are clamped; if start ends up past end they are equalized.
 */
export function validateTimeRange(
  startSeconds: number,
  endSeconds: number,
  durationSeconds: number | null,
  label: string,
): TimeRangeValidation {
  const errors: string[] = []

  if (durationSeconds === null || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return {
      range: { startSeconds: Math.max(0, startSeconds), endSeconds: Math.max(0, endSeconds) },
      errors: ['Track length is not available yet'],
    }
  }

  let start = Math.max(0, startSeconds)
  let end = Math.max(0, endSeconds)

  if (startSeconds > durationSeconds) {
    errors.push(`${label} start cannot exceed track length`)
    start = durationSeconds
  }

  if (endSeconds > durationSeconds) {
    errors.push(`${label} end cannot exceed track length`)
    end = durationSeconds
  }

  if (start > end) {
    errors.push(`${label} start cannot be after ${label.toLowerCase()} end`)
    start = end
  }

  return { range: { startSeconds: start, endSeconds: end }, errors }
}

export function validateTransitionRange(
  startSeconds: number,
  endSeconds: number,
  durationSeconds: number | null,
): TimeRangeValidation {
  return validateTimeRange(startSeconds, endSeconds, durationSeconds, 'Transition')
}

export function validateDropInRange(
  startSeconds: number,
  endSeconds: number,
  durationSeconds: number | null,
): TimeRangeValidation {
  return validateTimeRange(startSeconds, endSeconds, durationSeconds, 'Drop-in')
}

const DEFAULT_OVERLAP_SECONDS = 30
const DEFAULT_OVERLAP_FRACTION = 0.25

function defaultOverlapSeconds(durationSeconds: number): number {
  return Math.min(DEFAULT_OVERLAP_SECONDS, durationSeconds * DEFAULT_OVERLAP_FRACTION)
}

/**
 * Free-time fallback when no beat grid is available: the last 30 seconds,
 * shortened for tracks under two minutes.
 */
export function defaultTransitionRange(durationSeconds: number): TimeRange {
  const overlap = defaultOverlapSeconds(durationSeconds)

  return {
    startSeconds: Math.max(0, durationSeconds - overlap),
    endSeconds: durationSeconds,
  }
}

/**
 * Default mix-in window: the first 30 seconds (or 25% on short tracks), so the
 * incoming fade matches the typical outgoing overlap length.
 */
export function defaultDropInRange(durationSeconds: number): TimeRange {
  const overlap = defaultOverlapSeconds(durationSeconds)

  return {
    startSeconds: 0,
    endSeconds: Math.min(durationSeconds, overlap),
  }
}

/** Clamps a dragged window into the track while preserving its length when possible. */
export function clampTimeRange(startSeconds: number, endSeconds: number, durationSeconds: number): TimeRange {
  const duration = Math.max(0, endSeconds - startSeconds)
  let start = Math.max(0, Math.min(startSeconds, durationSeconds))
  let end = Math.max(start, Math.min(endSeconds, durationSeconds))

  if (end - start < duration && start === 0) {
    end = Math.min(durationSeconds, duration)
  } else if (end - start < duration && end === durationSeconds) {
    start = Math.max(0, durationSeconds - duration)
  }

  return { startSeconds: start, endSeconds: end }
}
