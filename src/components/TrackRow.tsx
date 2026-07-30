import { formatDuration, formatFileSize } from '../lib/format'
import type { Track } from '../types'
import { MiniWaveform } from './MiniWaveform'
import { StatusCell } from './StatusCell'
import { TransitionInputs } from './TransitionInputs'
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from './icons'

interface TrackRowProps {
  track: Track
  position: number
  isFirst: boolean
  isLast: boolean
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onRemove: (id: string) => void
  onTransitionChange: (
    id: string,
    startSeconds: number,
    endSeconds: number,
  ) => { errors: string[]; range: { startSeconds: number; endSeconds: number } }
  isActive: boolean
}

const ACTION_BUTTON_CLASS =
  'flex size-8 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-colors hover:enabled:border-slate-500 hover:enabled:bg-slate-800 hover:enabled:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-30'

export function TrackRow({
  track,
  position,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
  onTransitionChange,
  isActive,
}: TrackRowProps) {
  const columnCount = 7

  return (
    <>
      <tr
        className={`border-t border-slate-800 transition-colors ${
          isActive ? 'bg-fuchsia-500/10' : 'hover:bg-slate-900/60'
        }`}
      >
        <td className="px-4 py-3 align-middle">
          <span
            className={`font-mono text-sm tabular-nums ${isActive ? 'text-fuchsia-300' : 'text-slate-500'}`}
            aria-current={isActive ? 'true' : undefined}
          >
            {String(position).padStart(2, '0')}
          </span>
        </td>

        <td className="max-w-xs px-4 py-3 align-middle">
          <div className="truncate font-medium text-slate-100" title={track.title}>
            {track.title}
          </div>
          <div className="mt-0.5 truncate text-xs text-slate-500">
            {formatDuration(track.durationSeconds)} · {formatFileSize(track.file.size)}
          </div>
        </td>

        <td className="max-w-40 truncate px-4 py-3 align-middle text-slate-300" title={track.artist}>
          {track.artist}
        </td>

        <td className="px-4 py-3 align-middle">
          <span className="inline-block max-w-40 truncate rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
            {track.genre}
          </span>
        </td>

        <td className="px-4 py-3 align-middle">
          {track.camelotKey !== null ? (
            <span
              className="inline-flex items-baseline gap-1 font-mono text-sm font-semibold tabular-nums text-indigo-300"
              title={track.rawKey ?? track.camelotKey}
            >
              {track.camelotKey}
            </span>
          ) : (
            <span className="text-sm text-slate-500">--</span>
          )}
        </td>

        <td className="px-4 py-3 align-middle">
          <StatusCell track={track} />
        </td>

        <td className="px-4 py-3 align-middle">
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              className={ACTION_BUTTON_CLASS}
              onClick={() => onMoveUp(track.id)}
              disabled={isFirst}
              aria-label={`Move ${track.title} up`}
            >
              <ArrowUpIcon className="size-4" />
            </button>
            <button
              type="button"
              className={ACTION_BUTTON_CLASS}
              onClick={() => onMoveDown(track.id)}
              disabled={isLast}
              aria-label={`Move ${track.title} down`}
            >
              <ArrowDownIcon className="size-4" />
            </button>
            <button
              type="button"
              className={`${ACTION_BUTTON_CLASS} hover:enabled:border-rose-500/60 hover:enabled:bg-rose-500/10 hover:enabled:text-rose-300`}
              onClick={() => onRemove(track.id)}
              aria-label={`Remove ${track.title}`}
            >
              <TrashIcon className="size-4" />
            </button>
          </div>
        </td>
      </tr>

      <tr className={`border-t border-slate-800/60 ${isActive ? 'bg-fuchsia-500/5' : 'bg-slate-950/30'}`}>
        <td colSpan={columnCount} className="px-4 py-3">
          <div className="space-y-3">
            <TransitionInputs track={track} onChange={onTransitionChange} />
            <MiniWaveform
              peaks={track.waveformPeaks}
              durationSeconds={track.durationSeconds}
              startSeconds={track.transitionStartSeconds}
              endSeconds={track.transitionEndSeconds}
              bpm={track.bpm}
              beatOffsetSeconds={track.beatOffsetSeconds}
            />
          </div>
        </td>
      </tr>
    </>
  )
}
