export interface TransitionRange {
  startSeconds: number
  endSeconds: number
}

export interface TransitionValidation {
  range: TransitionRange
  /** Non-empty when the submitted values were clamped or rejected in part. */
  errors: string[]
}

const TIME_PATTERN = /^(\d+):([0-5]?\d)$/

/** Parses `M:SS` or `MM:SS` into whole seconds. Returns `null` when invalid. */
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

  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60) {
    return null
  }

  return minutes * 60 + seconds
}

/** Formats seconds as `M:SS` for transition inputs. */
export function formatTimeInput(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  const remainder = total % 60
  return `${minutes}:${String(remainder).padStart(2, '0')}`
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
 * Default mix-out window: the last 30 seconds, shortened for tracks under two
 * minutes. Taking a fixed 30s off a short track would put its transition start at
 * 00:00, which stacks the whole set on top of itself.
 */
export function defaultTransitionRange(durationSeconds: number): TransitionRange {
  const overlap = Math.min(DEFAULT_OVERLAP_SECONDS, durationSeconds * DEFAULT_OVERLAP_FRACTION)

  return {
    startSeconds: Math.max(0, durationSeconds - overlap),
    endSeconds: durationSeconds,
  }
}
