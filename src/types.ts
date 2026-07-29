/** Lifecycle of a track's automated metadata + BPM analysis. */
export type AnalysisStatus = 'queued' | 'analyzing' | 'ready' | 'failed'

export interface Track {
  id: string
  file: File
  /** ID3 title, or the filename when the tag is missing. */
  title: string
  artist: string
  genre: string
  /** Camelot wheel code such as `8A`, parsed from embedded key tags. */
  camelotKey: string | null
  /** Raw key string from the file tag, shown on hover when present. */
  rawKey: string | null
  /** Estimated tempo, rounded to one decimal. `null` until analysis succeeds. */
  bpm: number | null
  durationSeconds: number | null
  /** Mix-out window start, in seconds from the beginning of the track. */
  transitionStartSeconds: number | null
  /** Mix-out window end, in seconds from the beginning of the track. */
  transitionEndSeconds: number | null
  /** Downsampled peak envelope for the mini-waveform strip. */
  waveformPeaks: number[] | null
  status: AnalysisStatus
  /** Why BPM estimation failed, shown in place of the tempo. */
  errorMessage?: string
}
