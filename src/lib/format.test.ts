import { describe, expect, it } from 'vitest'
import { formatBpm, formatDuration, formatFileSize, formatTotalDuration } from './format'

describe('formatDuration', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(9)).toBe('0:09')
    expect(formatDuration(215.4)).toBe('3:35')
    expect(formatDuration(3600)).toBe('60:00')
  })

  it('shows a placeholder before the file has been decoded', () => {
    expect(formatDuration(null)).toBe('--:--')
    expect(formatDuration(Number.NaN)).toBe('--:--')
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('--:--')
  })
})

describe('formatTotalDuration', () => {
  it('switches to hours once the set passes 60 minutes', () => {
    expect(formatTotalDuration(0)).toBe('0m 00s')
    expect(formatTotalDuration(95)).toBe('1m 35s')
    expect(formatTotalDuration(3600)).toBe('1h 00m')
    expect(formatTotalDuration(3600 + 4 * 60)).toBe('1h 04m')
  })
})

describe('formatBpm', () => {
  it('always shows one decimal', () => {
    expect(formatBpm(128)).toBe('128.0')
    expect(formatBpm(97.5)).toBe('97.5')
  })

  it('shows a placeholder when the tempo is unknown', () => {
    expect(formatBpm(null)).toBe('--')
  })
})

describe('formatFileSize', () => {
  it('falls back to kilobytes for small files', () => {
    expect(formatFileSize(2048)).toBe('2 KB')
    expect(formatFileSize(1)).toBe('1 KB')
  })

  it('uses megabytes above the threshold', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
