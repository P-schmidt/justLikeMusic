/** Lifecycle of a track's automated metadata + BPM analysis. */
export type AnalysisStatus = 'queued' | 'analyzing' | 'ready' | 'failed'

export interface Track {
  id: string
  file: File
  /** ID3 title, or the filename when the tag is missing. */
  title: string
  artist: string
  genre: string
  /** Estimated tempo, rounded to one decimal. `null` until analysis succeeds. */
  bpm: number | null
  durationSeconds: number | null
  status: AnalysisStatus
  /** Why BPM estimation failed, shown in place of the tempo. */
  errorMessage?: string
}
