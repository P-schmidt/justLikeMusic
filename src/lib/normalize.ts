/**
 * Target RMS for each track after normalization, in dBFS.
 * −14 sits near common streaming loudness without pushing vinyl-era soul too hard.
 */
export const TARGET_RMS_DBFS = -14
/** Cap how far a quiet file can be boosted — stops noise floors from exploding. */
export const MAX_NORM_GAIN_DB = 12
/** Cap how far a hot master can be pulled down. */
export const MIN_NORM_GAIN_DB = -12
/** After RMS matching, keep peaks from clipping the master bus. */
export const PEAK_CEILING_DBFS = -1

const SAMPLE_STRIDE = 8

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function dbToGain(db: number): number {
  return 10 ** (db / 20)
}

export function gainToDb(gain: number): number {
  if (gain <= 0) {
    return -Infinity
  }
  return 20 * Math.log10(gain)
}

/**
 * RMS and peak of an AudioBuffer, sampled with a stride so long tracks stay cheap.
 * Channels are pooled into one measurement so stereo width does not bias the result.
 */
export function measureLoudness(buffer: AudioBuffer): { rms: number; peak: number } {
  const channelCount = buffer.numberOfChannels
  let sumSquares = 0
  let samples = 0
  let peak = 0

  for (let channel = 0; channel < channelCount; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let index = 0; index < data.length; index += SAMPLE_STRIDE) {
      const sample = data[index]
      const magnitude = Math.abs(sample)
      peak = Math.max(peak, magnitude)
      sumSquares += sample * sample
      samples += 1
    }
  }

  if (samples === 0) {
    return { rms: 0, peak: 0 }
  }

  return { rms: Math.sqrt(sumSquares / samples), peak }
}

/**
 * Linear gain that brings a track near the target RMS without clipping.
 *
 * Quiet rips get a limited boost; brickwalled modern masters get attenuated.
 * The peak ceiling is applied after the RMS match so a short loud transient
 * cannot shove the rest of the set into the red.
 */
export function normalizationGain(buffer: AudioBuffer): number {
  const { rms, peak } = measureLoudness(buffer)

  if (rms <= 0 || peak <= 0) {
    return 1
  }

  const rmsDb = gainToDb(rms)
  let gainDb = clamp(TARGET_RMS_DBFS - rmsDb, MIN_NORM_GAIN_DB, MAX_NORM_GAIN_DB)
  let gain = dbToGain(gainDb)

  const peakAfter = peak * gain
  const peakCeiling = dbToGain(PEAK_CEILING_DBFS)
  if (peakAfter > peakCeiling) {
    gain *= peakCeiling / peakAfter
  }

  return gain
}
