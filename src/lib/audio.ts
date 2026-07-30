/**
 * Beat detection sees a window from the middle of the track rather than the whole
 * thing. Analyzing everything is both slower and less accurate: the detector
 * builds one interval histogram for the audio it is given, so intros, outros and
 * breakdowns pull the estimate off the actual tempo. Measured across test tracks,
 * 30s matched or beat every longer window while running several times faster.
 */
const ANALYSIS_WINDOW_SECONDS = 30

let sharedContext: AudioContext | null = null

/** One context is shared by decoding and playback so scheduling uses the same clock. */
export function getAudioContext(): AudioContext {
  sharedContext ??= new AudioContext()
  return sharedContext
}

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const encoded = await file.arrayBuffer()

  try {
    return await getAudioContext().decodeAudioData(encoded)
  } catch {
    throw new Error('Could not decode audio')
  }
}

function centeredWindow(totalSeconds: number): { offset: number; duration: number } {
  if (totalSeconds <= ANALYSIS_WINDOW_SECONDS) {
    return { offset: 0, duration: totalSeconds }
  }

  return {
    offset: (totalSeconds - ANALYSIS_WINDOW_SECONDS) / 2,
    duration: ANALYSIS_WINDOW_SECONDS,
  }
}

export interface TempoGuess {
  /** Estimated tempo in beats per minute, rounded to one decimal. */
  bpm: number
  /**
   * Beat-grid phase from `web-audio-beat-detector`'s `guess()` — the time of a
   * detected beat, used to place bar lines and snap transitions.
   */
  offsetSeconds: number
}

/** Tempo + beat phase via `guess()`. Throws when no steady beat is found. */
export async function estimateTempo(audioBuffer: AudioBuffer): Promise<TempoGuess> {
  const { offset, duration } = centeredWindow(audioBuffer.duration)

  let result: { bpm: number; offset: number }
  try {
    const { guess } = await import('web-audio-beat-detector')
    result = await guess(audioBuffer, offset, duration)
  } catch {
    throw new Error('No steady beat found')
  }

  if (!Number.isFinite(result.bpm) || result.bpm <= 0 || !Number.isFinite(result.offset)) {
    throw new Error('No steady beat found')
  }

  return {
    bpm: Math.round(result.bpm * 10) / 10,
    // `guess` offset is relative to the analysis window start.
    offsetSeconds: offset + result.offset,
  }
}
