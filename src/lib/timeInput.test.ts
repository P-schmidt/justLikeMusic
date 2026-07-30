import { describe, expect, it } from 'vitest'
import {
  defaultTransitionRange,
  formatTimeInput,
  parseTimeInput,
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
