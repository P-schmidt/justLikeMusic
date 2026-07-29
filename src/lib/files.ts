/** Browsers leave `File.type` empty for several of these, so match on extension too. */
const AUDIO_EXTENSIONS = [
  'mp3',
  'm4a',
  'm4b',
  'mp4',
  'aac',
  'flac',
  'ogg',
  'oga',
  'opus',
  'wav',
  'wave',
  'aif',
  'aiff',
  'wma',
  'webm',
]

export const AUDIO_ACCEPT = ['audio/*', ...AUDIO_EXTENSIONS.map((extension) => `.${extension}`)].join(',')

export const SUPPORTED_FORMATS_LABEL = 'MP3, M4A, AAC, FLAC, OGG, OPUS, WAV, AIFF'

export function isAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/')) {
    return true
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  return extension !== undefined && AUDIO_EXTENSIONS.includes(extension)
}

/** Identity of a picked file, used to keep the same file from being queued twice. */
export function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}
