import { formatDuration, formatFileSize } from '../lib/format'
import { formatTimeInput } from '../lib/timeInput'
import type { Track } from '../types'
import { MiniWaveform } from './MiniWaveform'
import { StatusCell } from './StatusCell'
import { WindowInputs } from './WindowInputs'
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
  onDropInChange: (
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
  onDropInChange,
  isActive,
}: TrackRowProps) {
  const columnCount = 7

  const setDropInCue = (cueSeconds: number) => {
    // Keep any stored end so a later reorder still has a mix-in window.
    return onDropInChange(track.id, cueSeconds, Math.max(cueSeconds, track.dropInEndSeconds ?? cueSeconds))
  }

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
            <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-sm bg-cyan-400/80" aria-hidden />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {isFirst ? 'Drop-in' : 'Drop-in window'}
                  </span>
                </div>
                <WindowInputs
                  idPrefix={`${track.id}-drop-in`}
                  label="Drop-in"
                  startSeconds={track.dropInStartSeconds}
                  endSeconds={track.dropInEndSeconds}
                  durationSeconds={track.durationSeconds}
                  point={isFirst}
                  accentClassName="focus-visible:outline-cyan-400"
                  onChange={(start, end) =>
                    isFirst ? setDropInCue(start) : onDropInChange(track.id, start, end)
                  }
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-sm bg-fuchsia-400/80" aria-hidden />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Transition window
                  </span>
                </div>
                <WindowInputs
                  idPrefix={`${track.id}-transition`}
                  label="Transition"
                  startSeconds={track.transitionStartSeconds}
                  endSeconds={track.transitionEndSeconds}
                  durationSeconds={track.durationSeconds}
                  accentClassName="focus-visible:outline-fuchsia-400"
                  onChange={(start, end) => onTransitionChange(track.id, start, end)}
                />
              </div>

              {track.durationSeconds !== null && (
                <span className="self-end pb-1 text-xs text-slate-500">
                  Track length {formatTimeInput(track.durationSeconds)} · drag the waveform to adjust
                </span>
              )}
            </div>

            <MiniWaveform
              peaks={track.waveformPeaks}
              durationSeconds={track.durationSeconds}
              bpm={track.bpm}
              beatOffsetSeconds={track.beatOffsetSeconds}
              windows={[
                {
                  id: 'drop-in',
                  label: isFirst ? 'Drop-in' : 'Drop-in window',
                  startSeconds: track.dropInStartSeconds,
                  endSeconds: track.dropInEndSeconds,
                  point: isFirst,
                  toneClassName: 'border-x border-cyan-400/80 bg-cyan-500/20',
                  handleClassName: 'bg-cyan-300/90',
                  onChange: (start, end) => {
                    if (isFirst) {
                      setDropInCue(start)
                      return
                    }
                    onDropInChange(track.id, start, end)
                  },
                },
                {
                  id: 'transition',
                  label: 'Transition window',
                  startSeconds: track.transitionStartSeconds,
                  endSeconds: track.transitionEndSeconds,
                  toneClassName: 'border-x border-fuchsia-400/80 bg-fuchsia-500/20',
                  handleClassName: 'bg-fuchsia-300/90',
                  onChange: (start, end) => {
                    onTransitionChange(track.id, start, end)
                  },
                },
              ]}
            />
          </div>
        </td>
      </tr>
    </>
  )
}
