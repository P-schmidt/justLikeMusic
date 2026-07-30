export interface TransitionRange {
  startSeconds: number
  endSeconds: number
}

export interface TransitionValidation {
  range: TransitionRange
  /** Non-empty when the submitted values were clamped or rejected in part. */
  errors: string[]
}

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
 * Keeps a transition window inside `[0, duration]` with start ≤ end. Values above
 * the track length are clamped; if start ends up past end they are equalized.
 */
export function validateTransitionRange(
  startSeconds: number,
  endSeconds: number,
  durationSeconds: number | null,
): TransitionValidation {
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
    errors.push('Transition start cannot exceed track length')
    start = durationSeconds
  }

  if (endSeconds > durationSeconds) {
    errors.push('Transition end cannot exceed track length')
    end = durationSeconds
  }

  if (start > end) {
    errors.push('Transition start cannot be after transition end')
    start = end
  }

  return { range: { startSeconds: start, endSeconds: end }, errors }
}

const DEFAULT_OVERLAP_SECONDS = 30
const DEFAULT_OVERLAP_FRACTION = 0.25

/**
 * Free-time fallback when no beat grid is available: the last 30 seconds,
 * shortened for tracks under two minutes.
 */
export function defaultTransitionRange(durationSeconds: number): TransitionRange {
  const overlap = Math.min(DEFAULT_OVERLAP_SECONDS, durationSeconds * DEFAULT_OVERLAP_FRACTION)

  return {
    startSeconds: Math.max(0, durationSeconds - overlap),
    endSeconds: durationSeconds,
  }
}
