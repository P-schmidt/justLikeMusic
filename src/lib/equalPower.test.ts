import { describe, expect, it } from 'vitest'
import { equalPowerCurve, equalPowerGain } from './equalPower'

describe('equalPowerGain', () => {
  it('runs from silence to unity for an incoming track', () => {
    expect(equalPowerGain('in', 0)).toBeCloseTo(0)
    expect(equalPowerGain('in', 1)).toBeCloseTo(1)
  })

  it('runs from unity to silence for an outgoing track', () => {
    expect(equalPowerGain('out', 0)).toBeCloseTo(1)
    expect(equalPowerGain('out', 1)).toBeCloseTo(0)
  })

  it('holds constant power across the crossfade', () => {
    for (let step = 0; step <= 10; step += 1) {
      const progress = step / 10
      const outgoing = equalPowerGain('out', progress)
      const incoming = equalPowerGain('in', progress)
      expect(outgoing ** 2 + incoming ** 2).toBeCloseTo(1)
    }
  })

  it('crosses at -3 dB rather than -6 dB like a linear fade', () => {
    expect(equalPowerGain('in', 0.5)).toBeCloseTo(Math.SQRT1_2, 5)
    expect(equalPowerGain('out', 0.5)).toBeCloseTo(Math.SQRT1_2, 5)
  })

  it('clamps progress outside 0..1', () => {
    expect(equalPowerGain('in', -1)).toBeCloseTo(0)
    expect(equalPowerGain('in', 5)).toBeCloseTo(1)
  })
})

describe('equalPowerCurve', () => {
  it('spans the full fade by default', () => {
    const curve = equalPowerCurve('in')
    expect(curve[0]).toBeCloseTo(0)
    expect(curve[curve.length - 1]).toBeCloseTo(1)
  })

  it('rises monotonically for a fade-in and falls for a fade-out', () => {
    const rising = equalPowerCurve('in', 0, 1, 16)
    const falling = equalPowerCurve('out', 0, 1, 16)

    for (let index = 1; index < rising.length; index += 1) {
      expect(rising[index]).toBeGreaterThan(rising[index - 1])
      expect(falling[index]).toBeLessThan(falling[index - 1])
    }
  })

  it('emits only the requested slice, for joining a fade partway through', () => {
    const tail = equalPowerCurve('out', 0.5, 1, 8)
    expect(tail[0]).toBeCloseTo(Math.SQRT1_2, 5)
    expect(tail[tail.length - 1]).toBeCloseTo(0)
  })

  it('honours the requested resolution', () => {
    expect(equalPowerCurve('in', 0, 1, 32)).toHaveLength(32)
  })
})
