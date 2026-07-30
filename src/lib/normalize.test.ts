import { describe, expect, it } from 'vitest'
import {
  MAX_NORM_GAIN_DB,
  MIN_NORM_GAIN_DB,
  PEAK_CEILING_DBFS,
  TARGET_RMS_DBFS,
  dbToGain,
  gainToDb,
  measureLoudness,
  normalizationGain,
} from './normalize'

function fakeBuffer(samples: Float32Array): AudioBuffer {
  return {
    numberOfChannels: 1,
    length: samples.length,
    sampleRate: 44100,
    duration: samples.length / 44100,
    getChannelData: () => samples,
  } as unknown as AudioBuffer
}

describe('gain conversion', () => {
  it('round-trips linear gain through dB', () => {
    expect(gainToDb(1)).toBeCloseTo(0)
    expect(dbToGain(0)).toBeCloseTo(1)
    expect(gainToDb(dbToGain(-14))).toBeCloseTo(-14)
  })
})

describe('measureLoudness', () => {
  it('reports zero for silence', () => {
    const silent = fakeBuffer(new Float32Array(1024))
    expect(measureLoudness(silent)).toEqual({ rms: 0, peak: 0 })
  })

  it('measures a constant tone', () => {
    const { rms, peak } = measureLoudness(fakeBuffer(new Float32Array(2048).fill(0.5)))
    expect(peak).toBeCloseTo(0.5)
    expect(rms).toBeCloseTo(0.5)
  })
})

describe('normalizationGain', () => {
  it('boosts a quiet signal toward the target RMS', () => {
    // −26 dBFS-ish tone: should get a noticeable boost, capped by MAX_NORM_GAIN_DB.
    const quiet = fakeBuffer(new Float32Array(4096).fill(0.05))
    const gain = normalizationGain(quiet)
    expect(gain).toBeGreaterThan(1)
    expect(gainToDb(gain)).toBeLessThanOrEqual(MAX_NORM_GAIN_DB + 0.01)
  })

  it('attenuates a hot signal toward the target RMS', () => {
    const hot = fakeBuffer(new Float32Array(4096).fill(0.9))
    const gain = normalizationGain(hot)
    expect(gain).toBeLessThan(1)
    expect(gainToDb(gain)).toBeGreaterThanOrEqual(MIN_NORM_GAIN_DB - 0.01)
  })

  it('respects the peak ceiling so a boosted track cannot clip', () => {
    // Short loud spikes with a quiet average — RMS wants a boost, peak forbids it.
    const samples = new Float32Array(4096).fill(0.02)
    samples[0] = 0.99
    samples[1] = 0.99
    const gain = normalizationGain(fakeBuffer(samples))
    expect(0.99 * gain).toBeLessThanOrEqual(dbToGain(PEAK_CEILING_DBFS) + 1e-6)
  })

  it('leaves near-target material close to unity', () => {
    const targetLinear = dbToGain(TARGET_RMS_DBFS)
    const matched = fakeBuffer(new Float32Array(4096).fill(targetLinear))
    expect(normalizationGain(matched)).toBeCloseTo(1, 1)
  })

  it('returns unity for silence instead of dividing by zero', () => {
    expect(normalizationGain(fakeBuffer(new Float32Array(512)))).toBe(1)
  })
})
