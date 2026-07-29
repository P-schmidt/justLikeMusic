import type { Track } from '../types'
import { TrackRow } from './TrackRow'
import { WaveformIcon } from './icons'

interface TrackTableProps {
  tracks: Track[]
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onRemove: (id: string) => void
}

const COLUMNS = ['#', 'Track title', 'Artist', 'Genre', 'BPM']

export function TrackTable({ tracks, onMoveUp, onMoveDown, onRemove }: TrackTableProps) {
  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-16 text-center">
        <WaveformIcon className="size-8 text-slate-600" />
        <p className="font-medium text-slate-300">No tracks in the sequence yet</p>
        <p className="max-w-sm text-sm text-slate-500">
          Add audio files above and each one is tagged and beat-matched automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
      <div className="overflow-x-auto">
        <table className="w-full min-w-3xl border-collapse text-left text-sm">
          <caption className="sr-only">
            Mix sequence, in play order. Use the row buttons to reorder or remove tracks.
          </caption>
          <thead>
            <tr className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {COLUMNS.map((column) => (
                <th key={column} scope="col" className="px-4 py-3">
                  {column}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                position={index + 1}
                isFirst={index === 0}
                isLast={index === tracks.length - 1}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                onRemove={onRemove}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
