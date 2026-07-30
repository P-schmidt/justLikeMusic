import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MIXOUT_BARS,
  barIntervalSeconds,
  beatIntervalSeconds,
  defaultBarAlignedTransition,
  iterateBars,
  iterateBeats,
  listBars,
  snapToNearestBar,
  snapTransitionRange,
} from './beatGrid'

describe('intervals', () => {
  it('derives beat and bar lengths from BPM in 4/4', () => {
    expect(beatIntervalSeconds(120)).toBeCloseTo(0.5)
    expect(barIntervalSeconds(120)).toBeCloseTo(2)
    expect(barIntervalSeconds(90)).toBeCloseTo(4 * (60 / 90))
  })
})

describe('iterateBeats / iterateBars', () => {
  it('places beats on the phase grid', () => {
    const beats = [...iterateBeats(120, 0.1, 2.1)]
    expect(beats[0]).toBeCloseTo(0.1)
    expect(beats[1]).toBeCloseTo(0.6)
    expect(beats.at(-1)).toBeCloseTo(2.1)
  })

  it('marks every fourth beat as a bar start', () => {
    const bars = [...iterateBars(120, 0, 8)]
    expect(bars).toEqual([0, 2, 4, 6, 8])
  })

  it('yields nothing for invalid tempo or duration', () => {
    expect([...iterateBeats(0, 0, 10)]).toEqual([])
    expect([...iterateBars(120, 0, 0)]).toEqual([])
  })
})

describe('snapToNearestBar', () => {
  it('snaps to the closest bar inside the track', () => {
    // Bars at 0, 2, 4, 6, … for 120 BPM / offset 0
    expect(snapToNearestBar(0.4, 120, 0, 20)).toBeCloseTo(0)
    expect(snapToNearestBar(1.1, 120, 0, 20)).toBeCloseTo(2)
    expect(snapToNearestBar(4.4, 120, 0, 20)).toBeCloseTo(4)
    expect(snapToNearestBar(5.1, 120, 0, 20)).toBeCloseTo(6)
  })

  it('never snaps past the track length', () => {
    expect(snapToNearestBar(19.9, 120, 0, 19)).toBeLessThanOrEqual(19)
  })

  it('respects a non-zero beat offset', () => {
    // Offset 0.25s → bars at 0.25, 2.25, 4.25, …
    expect(snapToNearestBar(2.0, 120, 0.25, 20)).toBeCloseTo(2.25)
  })
})

describe('snapTransitionRange', () => {
  it('snaps both ends onto bars and keeps start before end', () => {
    const range = snapTransitionRange(3.1, 11.2, 120, 0, 40)
    expect(range.startSeconds).toBeCloseTo(4)
    expect(range.endSeconds).toBeCloseTo(12)
    expect(range.startSeconds).toBeLessThan(range.endSeconds)
  })

  it('expands a collapsed window by one bar when possible', () => {
    const range = snapTransitionRange(8, 8.1, 120, 0, 40)
    expect(range.startSeconds).toBeCloseTo(8)
    expect(range.endSeconds).toBeCloseTo(10)
  })
})

describe('defaultBarAlignedTransition', () => {
  it(`uses the last ${DEFAULT_MIXOUT_BARS} bars when the track is long enough`, () => {
    // 120 BPM → 2s/bar; 60s track → bars 0..60
    const range = defaultBarAlignedTransition(60, 120, 0)
    expect(range).not.toBeNull()
    expect(range!.endSeconds - range!.startSeconds).toBeCloseTo(DEFAULT_MIXOUT_BARS * 2)
    expect(range!.endSeconds).toBeCloseTo(60)
  })

  it('uses fewer bars on a short track', () => {
    // Only a handful of bars available
    const range = defaultBarAlignedTransition(10, 120, 0)
    expect(range).not.toBeNull()
    expect(range!.startSeconds).toBeLessThan(range!.endSeconds)
    expect(range!.endSeconds - range!.startSeconds).toBeLessThanOrEqual(DEFAULT_MIXOUT_BARS * 2)
  })

  it('returns null when a grid cannot be built', () => {
    expect(defaultBarAlignedTransition(60, 0, 0)).toBeNull()
    expect(defaultBarAlignedTransition(1, 120, 0)).toBeNull()
  })

  it('lands both ends on bar boundaries', () => {
    const range = defaultBarAlignedTransition(90, 90, 0.1)!
    const bars = listBars(90, 0.1, 90)
    const onGrid = (time: number) => bars.some((bar) => Math.abs(bar - time) < 1e-6)

    expect(onGrid(range.startSeconds)).toBe(true)
    expect(onGrid(range.endSeconds)).toBe(true)
  })
})
