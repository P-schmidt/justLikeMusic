import { describe, expect, it } from 'vitest'
import { fileKey, isAudioFile } from './files'

function fakeFile(name: string, type = '', size = 1024, lastModified = 1_700_000_000_000): File {
  return { name, type, size, lastModified } as File
}

describe('isAudioFile', () => {
  it('accepts anything the browser reports as audio', () => {
    expect(isAudioFile(fakeFile('track', 'audio/mpeg'))).toBe(true)
  })

  it('falls back to the extension when the browser reports no type', () => {
    expect(isAudioFile(fakeFile('track.flac'))).toBe(true)
    expect(isAudioFile(fakeFile('TRACK.AIFF'))).toBe(true)
  })

  it('rejects non-audio files', () => {
    expect(isAudioFile(fakeFile('cover.jpg', 'image/jpeg'))).toBe(false)
    expect(isAudioFile(fakeFile('tracklist.txt', 'text/plain'))).toBe(false)
    expect(isAudioFile(fakeFile('no-extension'))).toBe(false)
  })
})

describe('fileKey', () => {
  it('treats identical files as the same entry', () => {
    expect(fileKey(fakeFile('a.mp3'))).toBe(fileKey(fakeFile('a.mp3')))
  })

  it('distinguishes different names, sizes and timestamps', () => {
    const base = fileKey(fakeFile('a.mp3'))
    expect(fileKey(fakeFile('b.mp3'))).not.toBe(base)
    expect(fileKey(fakeFile('a.mp3', '', 2048))).not.toBe(base)
    expect(fileKey(fakeFile('a.mp3', '', 1024, 1))).not.toBe(base)
  })
})
