export type FadeDirection = 'in' | 'out'

/**
 * Hip-hop / soul / eclectic defaults — gentler than a house EQ kill so 808s and
 * warm bass retain body mid-transition instead of vanishing into a thin midrange.
 */
export const BASS_SHELF_FREQUENCY_HZ = 220
export const BASS_SHELF_Q = 0.7
/** Deepest low-shelf cut during a transition, in dB. */
export const BASS_CUT_DB = -15
/** Fixed rumble / DC safety high-pass — below musical bass content. */
export const RUMBLE_HIGHPASS_HZ = 40

const CURVE_RESOLUTION = 128

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Low-shelf gain (dB) at a point in a transition, where `progress` runs 0 → 1.
 *
 * Outgoing tracks dive from flat (0) into the cut; incoming tracks rise from the
 * cut back to flat. The dip is what keeps two kick drums from stacking into mud.
 */
export function bassShelfGainDb(direction: FadeDirection, progress: number): number {
  const clamped = clamp(progress, 0, 1)
  return direction === 'out' ? BASS_CUT_DB * clamped : BASS_CUT_DB * (1 - clamped)
}

/**
 * Samples a bass-shelf automation curve for `AudioParam.setValueCurveAtTime`.
 * Values are in dB — the unit `BiquadFilterNode.gain` uses for low-shelf filters.
 */
export function bassShelfCurve(
  direction: FadeDirection,
  fromProgress = 0,
  toProgress = 1,
  points = CURVE_RESOLUTION,
): Float32Array {
  const curve = new Float32Array(points)
  const span = toProgress - fromProgress

  for (let index = 0; index < points; index += 1) {
    const progress = fromProgress + (span * index) / (points - 1)
    curve[index] = bassShelfGainDb(direction, progress)
  }

  return curve
}
