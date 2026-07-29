interface MiniWaveformProps {
  peaks: number[] | null
  durationSeconds: number | null
  startSeconds: number | null
  endSeconds: number | null
}

export function MiniWaveform({ peaks, durationSeconds, startSeconds, endSeconds }: MiniWaveformProps) {
  if (peaks === null || peaks.length === 0) {
    return (
      <div
        className="flex h-10 w-full items-center justify-center rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-600"
        aria-hidden
      >
        Waveform loading…
      </div>
    )
  }

  const barWidth = 100 / peaks.length
  const hasWindow =
    durationSeconds !== null &&
    durationSeconds > 0 &&
    startSeconds !== null &&
    endSeconds !== null &&
    endSeconds > startSeconds

  const highlightLeft = hasWindow ? (startSeconds / durationSeconds) * 100 : 0
  const highlightWidth = hasWindow ? ((endSeconds - startSeconds) / durationSeconds) * 100 : 0

  return (
    <div className="relative h-10 w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80">
      <svg
        className="absolute inset-0 h-full w-full text-slate-600"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {peaks.map((peak, index) => {
          const height = Math.max(4, peak * 92)
          const x = index * barWidth
          const y = (100 - height) / 2

          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={Math.max(barWidth * 0.72, 0.15)}
              height={height}
              rx={0.2}
              fill="currentColor"
            />
          )
        })}
      </svg>

      {hasWindow && (
        <div
          className="pointer-events-none absolute inset-y-0 border-x border-fuchsia-400/80 bg-fuchsia-500/20"
          style={{ left: `${highlightLeft}%`, width: `${highlightWidth}%` }}
          aria-hidden
        />
      )}

      {hasWindow && durationSeconds !== null && startSeconds !== null && endSeconds !== null && (
        <span className="sr-only">
          Transition window from {startSeconds} to {endSeconds} seconds of {durationSeconds} total
        </span>
      )}
    </div>
  )
}
