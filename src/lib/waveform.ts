/** Downsampled peak envelope for the mini-waveform strip (one value per bar, 0..1). */
export function computeWaveformPeaks(buffer: AudioBuffer, barCount = 120): number[] {
  const channel = buffer.getChannelData(0)
  const samplesPerBar = Math.max(1, Math.floor(channel.length / barCount))
  const peaks: number[] = []

  for (let bar = 0; bar < barCount; bar += 1) {
    const start = bar * samplesPerBar
    const end = Math.min(start + samplesPerBar, channel.length)
    let peak = 0

    for (let sample = start; sample < end; sample += 1) {
      peak = Math.max(peak, Math.abs(channel[sample]))
    }

    peaks.push(peak)
  }

  const maxPeak = Math.max(...peaks, 0.001)
  return peaks.map((peak) => peak / maxPeak)
}
