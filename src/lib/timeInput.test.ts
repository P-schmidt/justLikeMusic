import { describe, expect, it } from 'vitest'
import {
  clampTimeRange,
  defaultDropInRange,
  defaultTransitionRange,
  formatTimeInput,
  parseTimeInput,
  validateDropInRange,
  validateTransitionRange,
} from './timeInput'

describe('parseTimeInput', () => {
  it('parses minutes and seconds', () => {
    expect(parseTimeInput('0:00')).toBe(0)
    expect(parseTimeInput('1:30')).toBe(90)
    expect(parseTimeInput('12:05')).toBe(725)
  })

  it('parses one decimal place', () => {
    expect(parseTimeInput('1:30.5')).toBe(90.5)
    expect(parseTimeInput('0:04.2')).toBe(4.2)
  })

  it('rejects invalid formats', () => {
    expect(parseTimeInput('')).toBeNull()
    expect(parseTimeInput('90')).toBeNull()
    expect(parseTimeInput('1:60')).toBeNull()
    expect(parseTimeInput('1:30.12')).toBeNull()
    expect(parseTimeInput('abc')).toBeNull()
  })
})

describe('formatTimeInput', () => {
  it('formats with one decimal so bar snaps stay visible', () => {
    expect(formatTimeInput(0)).toBe('0:00.0')
    expect(formatTimeInput(90)).toBe('1:30.0')
    expect(formatTimeInput(90.5)).toBe('1:30.5')
    expect(formatTimeInput(4.24)).toBe('0:04.2')
  })
})

describe('validateTransitionRange', () => {
  it('accepts a valid window inside the track', () => {
    const result = validateTransitionRange(30, 120, 180)
    expect(result.errors).toEqual([])
    expect(result.range).toEqual({ startSeconds: 30, endSeconds: 120 })
  })

  it('clamps values that exceed the track length', () => {
    const result = validateTransitionRange(200, 250, 180)
    expect(result.errors).toContain('Transition start cannot exceed track length')
    expect(result.errors).toContain('Transition end cannot exceed track length')
    expect(result.range).toEqual({ startSeconds: 180, endSeconds: 180 })
  })

  it('fixes start after end', () => {
    const result = validateTransitionRange(120, 60, 180)
    expect(result.errors).toContain('Transition start cannot be after transition end')
    expect(result.range).toEqual({ startSeconds: 60, endSeconds: 60 })
  })
})

describe('validateDropInRange', () => {
  it('labels clamp errors for the drop-in window', () => {
    const result = validateDropInRange(200, 250, 180)
    expect(result.errors).toContain('Drop-in start cannot exceed track length')
    expect(result.errors).toContain('Drop-in end cannot exceed track length')
  })
})

describe('defaultTransitionRange', () => {
  it('uses the last 30 seconds on a full-length track', () => {
    expect(defaultTransitionRange(240)).toEqual({ startSeconds: 210, endSeconds: 240 })
  })

  it('shortens the overlap on brief tracks so the start is never 0:00', () => {
    expect(defaultTransitionRange(20)).toEqual({ startSeconds: 15, endSeconds: 20 })
    expect(defaultTransitionRange(60)).toEqual({ startSeconds: 45, endSeconds: 60 })
  })

  it('always ends at the track length', () => {
    expect(defaultTransitionRange(97).endSeconds).toBe(97)
  })
})

describe('defaultDropInRange', () => {
  it('uses the first 30 seconds on a full-length track', () => {
    expect(defaultDropInRange(240)).toEqual({ startSeconds: 0, endSeconds: 30 })
  })

  it('shortens the window on brief tracks', () => {
    expect(defaultDropInRange(20)).toEqual({ startSeconds: 0, endSeconds: 5 })
    expect(defaultDropInRange(60)).toEqual({ startSeconds: 0, endSeconds: 15 })
  })
})

describe('clampTimeRange', () => {
  it('keeps a moved window inside the track', () => {
    expect(clampTimeRange(-10, 20, 100)).toEqual({ startSeconds: 0, endSeconds: 30 })
    expect(clampTimeRange(90, 120, 100)).toEqual({ startSeconds: 70, endSeconds: 100 })
  })
})
