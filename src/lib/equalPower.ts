const CURVE_RESOLUTION = 128

export type FadeDirection = 'in' | 'out'

/** Gain at a point in an equal-power crossfade, where `progress` runs 0 → 1. */
export function equalPowerGain(direction: FadeDirection, progress: number): number {
  const clamped = Math.min(Math.max(progress, 0), 1)
  const angle = (clamped * Math.PI) / 2
  return direction === 'in' ? Math.sin(angle) : Math.cos(angle)
}

/**
 * Samples an equal-power crossfade curve for `AudioParam.setValueCurveAtTime`.
 *
 * The outgoing track follows cos and the incoming one sin, so their squares sum
 * to 1 across the whole overlap. A linear pair would sum to less than 1 in the
 * middle, which is what makes naive crossfades dip in loudness halfway through.
 *
 * `fromProgress`/`toProgress` allow emitting only part of a fade, which is what
 * happens when playback joins a track that is already mid-crossfade after a seek.
 */
export function equalPowerCurve(
  direction: FadeDirection,
  fromProgress = 0,
  toProgress = 1,
  points = CURVE_RESOLUTION,
): Float32Array {
  const curve = new Float32Array(points)
  const span = toProgress - fromProgress

  for (let index = 0; index < points; index += 1) {
    const progress = fromProgress + (span * index) / (points - 1)
    curve[index] = equalPowerGain(direction, progress)
  }

  return curve
}
