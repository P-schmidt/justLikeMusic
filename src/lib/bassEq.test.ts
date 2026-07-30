import { describe, expect, it } from 'vitest'
import { BASS_CUT_DB, bassShelfCurve, bassShelfGainDb } from './bassEq'

describe('bassShelfGainDb', () => {
  it('starts flat and dives to the cut on the way out', () => {
    expect(bassShelfGainDb('out', 0)).toBeCloseTo(0)
    expect(bassShelfGainDb('out', 1)).toBeCloseTo(BASS_CUT_DB)
  })

  it('starts cut and rises to flat on the way in', () => {
    expect(bassShelfGainDb('in', 0)).toBeCloseTo(BASS_CUT_DB)
    expect(bassShelfGainDb('in', 1)).toBeCloseTo(0)
  })

  it('crosses at half the cut depth so both tracks share the bass mid-fade', () => {
    expect(bassShelfGainDb('out', 0.5)).toBeCloseTo(BASS_CUT_DB / 2)
    expect(bassShelfGainDb('in', 0.5)).toBeCloseTo(BASS_CUT_DB / 2)
  })

  it('uses a musical cut rather than a full EQ kill', () => {
    expect(BASS_CUT_DB).toBeGreaterThan(-24)
    expect(BASS_CUT_DB).toBeLessThan(-6)
  })
})

describe('bassShelfCurve', () => {
  it('spans the full outgoing dive by default', () => {
    const curve = bassShelfCurve('out')
    expect(curve[0]).toBeCloseTo(0)
    expect(curve[curve.length - 1]).toBeCloseTo(BASS_CUT_DB)
  })

  it('emits only the remaining slice when joining mid-fade', () => {
    const tail = bassShelfCurve('in', 0.5, 1, 8)
    expect(tail[0]).toBeCloseTo(BASS_CUT_DB / 2)
    expect(tail[tail.length - 1]).toBeCloseTo(0)
  })

  it('falls monotonically for an outgoing fade', () => {
    const falling = bassShelfCurve('out', 0, 1, 16)
    for (let index = 1; index < falling.length; index += 1) {
      expect(falling[index]).toBeLessThan(falling[index - 1])
    }
  })
})
