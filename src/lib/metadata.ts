export const UNKNOWN_ARTIST = 'Unknown artist'
export const UNKNOWN_GENRE = 'Unknown genre'

export interface TrackTags {
  title: string
  artist: string
  genre: string
}

/** Strips the extension so a filename can stand in for a missing title tag. */
export function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.[^./\\]+$/, '') || fileName
}

function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  return values.map((value) => value?.trim()).find((value) => Boolean(value))
}

/**
 * Reads ID3/Vorbis/MP4 tags. Missing or unreadable tags degrade to filename and
 * "Unknown" placeholders rather than failing the track.
 */
export async function readTrackTags(file: File): Promise<TrackTags> {
  const fallback: TrackTags = {
    title: titleFromFileName(file.name),
    artist: UNKNOWN_ARTIST,
    genre: UNKNOWN_GENRE,
  }

  try {
    // The tag parser is a large dependency, so it is only fetched once a file is
    // actually queued.
    const { parseBlob } = await import('music-metadata-browser')
    const { common } = await parseBlob(file, { skipCovers: true })

    return {
      title: firstNonEmpty(common.title) ?? fallback.title,
      artist: firstNonEmpty(common.artist, common.albumartist) ?? fallback.artist,
      genre: firstNonEmpty(common.genre?.filter(Boolean).join(', ')) ?? fallback.genre,
    }
  } catch {
    return fallback
  }
}
