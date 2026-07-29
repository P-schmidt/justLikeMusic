import { formatBpm, formatTotalDuration } from '../lib/format'
import type { Track } from '../types'

interface SetSummaryProps {
  tracks: Track[]
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-100">{value}</dd>
    </div>
  )
}

export function SetSummary({ tracks }: SetSummaryProps) {
  const withBpm = tracks.filter((track) => track.bpm !== null)
  const totalSeconds = tracks.reduce((sum, track) => sum + (track.durationSeconds ?? 0), 0)
  const averageBpm =
    withBpm.length === 0 ? null : withBpm.reduce((sum, track) => sum + (track.bpm ?? 0), 0) / withBpm.length
  const pending = tracks.filter((track) => track.status === 'queued' || track.status === 'analyzing').length

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Tracks" value={String(tracks.length)} />
      <Stat label="Runtime" value={formatTotalDuration(totalSeconds)} />
      <Stat label="Avg BPM" value={formatBpm(averageBpm === null ? null : Math.round(averageBpm * 10) / 10)} />
      <Stat label="Analyzing" value={String(pending)} />
    </dl>
  )
}
