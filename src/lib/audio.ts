/**
 * Beat detection cost scales with the length of the audio, and a mix track's
 * intro/outro is the least representative part of it. Sampling a window from the
 * middle keeps long files responsive without hurting the estimate.
 */
const ANALYSIS_WINDOW_SECONDS = 60

let sharedContext: AudioContext | null = null

function getAudioContext(): AudioContext {
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

/** Estimated tempo in beats per minute, rounded to one decimal. */
export async function estimateBpm(audioBuffer: AudioBuffer): Promise<number> {
  const { offset, duration } = centeredWindow(audioBuffer.duration)

  let tempo: number
  try {
    const { analyze } = await import('web-audio-beat-detector')
    tempo = await analyze(audioBuffer, offset, duration)
  } catch {
    throw new Error('No steady beat found')
  }

  if (!Number.isFinite(tempo) || tempo <= 0) {
    throw new Error('No steady beat found')
  }

  return Math.round(tempo * 10) / 10
}
