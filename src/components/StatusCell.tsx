import { formatBpm } from '../lib/format'
import type { Track } from '../types'
import { AlertIcon, SpinnerIcon } from './icons'

interface StatusCellProps {
  track: Track
}

/** Shows the estimated BPM, or the analysis state while there isn't one yet. */
export function StatusCell({ track }: StatusCellProps) {
  if (track.status === 'queued') {
    return <span className="text-sm text-slate-500">Queued</span>
  }

  if (track.status === 'analyzing') {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-slate-400">
        <SpinnerIcon className="size-4 animate-spin" />
        Detecting
      </span>
    )
  }

  if (track.status === 'failed') {
    return (
      <span
        className="inline-flex items-center gap-2 text-sm text-amber-400"
        title={track.errorMessage ?? 'Analysis failed'}
      >
        <AlertIcon className="size-4" />
        {track.errorMessage ?? 'Analysis failed'}
      </span>
    )
  }

  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="font-mono text-base font-semibold tabular-nums text-emerald-300">{formatBpm(track.bpm)}</span>
      <span className="text-xs text-slate-500">BPM</span>
    </span>
  )
}
