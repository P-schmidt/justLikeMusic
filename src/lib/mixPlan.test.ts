import { describe, expect, it } from 'vitest'
import { buildMixPlan, firstChangedIndex, segmentsAt } from './mixPlan'
import type { Track } from '../types'

function track(overrides: Partial<Track> & { id: string }): Track {
  return {
    file: { name: `${overrides.id}.mp3`, size: 1024, type: 'audio/mpeg', lastModified: 1 } as File,
    title: overrides.id,
    artist: 'Artist',
    genre: 'Genre',
    camelotKey: null,
    rawKey: null,
    bpm: 120,
    beatOffsetSeconds: 0,
    durationSeconds: 100,
    transitionStartSeconds: 90,
    transitionEndSeconds: 100,
    dropInStartSeconds: 0,
    dropInEndSeconds: 0,
    waveformPeaks: null,
    status: 'ready',
    ...overrides,
  }
}

describe('buildMixPlan', () => {
  it('returns an empty plan when nothing is playable', () => {
    expect(buildMixPlan([])).toEqual({ segments: [], totalDuration: 0 })
    expect(buildMixPlan([track({ id: 'a', durationSeconds: null })]).segments).toEqual([])
  })

  it('starts the next track at the previous transition start', () => {
    const plan = buildMixPlan([
      track({ id: 'a', durationSeconds: 100, transitionStartSeconds: 80, transitionEndSeconds: 90 }),
      track({ id: 'b', durationSeconds: 100, transitionStartSeconds: 70, transitionEndSeconds: 100 }),
      track({ id: 'c', durationSeconds: 60 }),
    ])

    expect(plan.segments.map((segment) => segment.startTime)).toEqual([0, 80, 150])
    // Last track runs to its own end rather than a transition point.
    expect(plan.totalDuration).toBe(210)
  })

  it('offsets the timeline when a track drops in after 00:00', () => {
    const plan = buildMixPlan([
      track({
        id: 'a',
        durationSeconds: 100,
        dropInStartSeconds: 10,
        dropInEndSeconds: 20,
        transitionStartSeconds: 80,
        transitionEndSeconds: 90,
      }),
      track({
        id: 'b',
        durationSeconds: 100,
        dropInStartSeconds: 5,
        dropInEndSeconds: 15,
        transitionStartSeconds: 90,
        transitionEndSeconds: 100,
      }),
    ])

    expect(plan.segments[0].localStart).toBe(10)
    expect(plan.segments[0].startTime).toBe(0)
    // Next track starts when A reaches transition start: 80 - 10 = 70 on the master clock.
    expect(plan.segments[1].startTime).toBe(70)
    expect(plan.segments[1].localStart).toBe(5)
    expect(plan.totalDuration).toBe(70 + (100 - 5))
  })

  it('stops each track at its transition end and the last at its duration', () => {
    const plan = buildMixPlan([
      track({ id: 'a', durationSeconds: 100, transitionStartSeconds: 80, transitionEndSeconds: 90 }),
      track({ id: 'b', durationSeconds: 60 }),
    ])

    expect(plan.segments[0].localEnd).toBe(90)
    expect(plan.segments[0].fadeOutStart).toBe(80)
    expect(plan.segments[0].fadeOutEnd).toBe(90)

    expect(plan.segments[1].localEnd).toBe(60)
    expect(plan.segments[1].fadeOutStart).toBeNull()
    expect(plan.segments[1].fadeOutEnd).toBeNull()
  })

  it('fades a track in over its drop-in window', () => {
    const plan = buildMixPlan([
      track({ id: 'a', durationSeconds: 100, transitionStartSeconds: 80, transitionEndSeconds: 95 }),
      track({ id: 'b', durationSeconds: 100, dropInStartSeconds: 0, dropInEndSeconds: 15 }),
    ])

    expect(plan.segments[0].fadeInDuration).toBe(0)
    expect(plan.segments[1].fadeInDuration).toBe(15)
  })

  it('never lets a fade-in outlast the point where the track fades out', () => {
    const plan = buildMixPlan([
      track({ id: 'a', durationSeconds: 100, transitionStartSeconds: 50, transitionEndSeconds: 90 }),
      track({
        id: 'b',
        durationSeconds: 100,
        dropInStartSeconds: 0,
        dropInEndSeconds: 40,
        transitionStartSeconds: 10,
        transitionEndSeconds: 20,
      }),
      track({ id: 'c', durationSeconds: 30 }),
    ])

    expect(plan.segments[1].fadeInDuration).toBe(10)
  })

  it('clamps transitions into the track and keeps start before end', () => {
    const plan = buildMixPlan([
      track({ id: 'a', durationSeconds: 50, transitionStartSeconds: 400, transitionEndSeconds: 500 }),
      track({ id: 'b', durationSeconds: 50, transitionStartSeconds: 40, transitionEndSeconds: 10 }),
      track({ id: 'c', durationSeconds: 50 }),
    ])

    expect(plan.segments[0].fadeOutStart).toBe(50)
    expect(plan.segments[0].fadeOutEnd).toBe(50)
    expect(plan.segments[1].fadeOutStart).toBe(40)
    expect(plan.segments[1].fadeOutEnd).toBe(40)
  })

  it('treats a missing transition as playing through to the end', () => {
    const plan = buildMixPlan([
      track({ id: 'a', durationSeconds: 100, transitionStartSeconds: null, transitionEndSeconds: null }),
      track({ id: 'b', durationSeconds: 100 }),
    ])

    expect(plan.segments[1].startTime).toBe(100)
    expect(plan.segments[0].fadeInDuration).toBe(0)
  })
})

describe('segmentsAt', () => {
  const plan = buildMixPlan([
    track({ id: 'a', durationSeconds: 100, transitionStartSeconds: 80, transitionEndSeconds: 90 }),
    track({ id: 'b', durationSeconds: 100, dropInStartSeconds: 0, dropInEndSeconds: 10 }),
  ])

  it('reports one track outside the overlap', () => {
    expect(segmentsAt(plan, 10).map((segment) => segment.trackId)).toEqual(['a'])
    expect(segmentsAt(plan, 120).map((segment) => segment.trackId)).toEqual(['b'])
  })

  it('reports both tracks during the crossfade', () => {
    expect(segmentsAt(plan, 85).map((segment) => segment.trackId)).toEqual(['a', 'b'])
  })

  it('reports nothing past the end', () => {
    expect(segmentsAt(plan, plan.totalDuration)).toEqual([])
  })
})

describe('firstChangedIndex', () => {
  const base = buildMixPlan([track({ id: 'a' }), track({ id: 'b' }), track({ id: 'c' })]).segments

  it('returns null for identical plans', () => {
    expect(firstChangedIndex(base, [...base])).toBeNull()
  })

  it('finds the earliest differing segment', () => {
    const edited = buildMixPlan([
      track({ id: 'a' }),
      track({ id: 'b', transitionStartSeconds: 50, transitionEndSeconds: 60 }),
      track({ id: 'c' }),
    ]).segments

    expect(firstChangedIndex(base, edited)).toBe(1)
  })

  it('ignores an edit to the final track, which always plays to its end', () => {
    const edited = buildMixPlan([
      track({ id: 'a' }),
      track({ id: 'b' }),
      track({ id: 'c', transitionStartSeconds: 10, transitionEndSeconds: 20 }),
    ]).segments

    expect(firstChangedIndex(base, edited)).toBeNull()
  })

  it('points at the first appended segment when a track is added', () => {
    const extended = buildMixPlan([
      track({ id: 'a' }),
      track({ id: 'b' }),
      track({ id: 'c' }),
      track({ id: 'd' }),
    ]).segments

    // The old final track gains a fade-out once it is no longer last.
    expect(firstChangedIndex(base, extended)).toBe(2)
  })
})
