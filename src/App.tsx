import { useCallback, useState } from 'react'
import { DropZone } from './components/DropZone'
import { SetSummary } from './components/SetSummary'
import { TrackTable } from './components/TrackTable'
import { WaveformIcon } from './components/icons'
import type { AddFilesResult } from './hooks/useTrackQueue'
import { useTrackQueue } from './hooks/useTrackQueue'

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function describeImport({ added, rejected, duplicates }: AddFilesResult): string | null {
  const parts: string[] = []

  if (added > 0) {
    parts.push(`Added ${pluralize(added, 'track')}`)
  }
  if (duplicates > 0) {
    parts.push(`${pluralize(duplicates, 'file')} already in the set`)
  }
  if (rejected > 0) {
    parts.push(`${pluralize(rejected, 'file')} skipped — not audio`)
  }

  return parts.length === 0 ? null : `${parts.join(' · ')}.`
}

export default function App() {
  const { tracks, addFiles, moveTrack, removeTrack, clearTracks } = useTrackQueue()
  const [notice, setNotice] = useState<string | null>(null)

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      setNotice(describeImport(addFiles(files)))
    },
    [addFiles],
  )

  const handleClear = useCallback(() => {
    clearTracks()
    setNotice(null)
  }, [clearTracks])

  const moveUp = useCallback((id: string) => moveTrack(id, -1), [moveTrack])
  const moveDown = useCallback((id: string) => moveTrack(id, 1), [moveTrack])

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white">
            <WaveformIcon className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Mix Sequencer</h1>
            <p className="text-sm text-slate-400">
              Drop in your set, get tags and tempo automatically, then lock in the running order.
            </p>
          </div>
        </header>

        <main className="mt-10 space-y-10">
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">1 · Load tracks</h2>
            <DropZone onFilesSelected={handleFilesSelected} />
            {notice !== null && (
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                <p aria-live="polite">{notice}</p>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="shrink-0 text-xs font-medium text-slate-500 transition-colors hover:text-slate-200"
                >
                  Dismiss
                </button>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                2 · Arrange the sequence
              </h2>
              {tracks.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-rose-500/60 hover:bg-rose-500/10 hover:text-rose-300"
                >
                  Clear all
                </button>
              )}
            </div>

            {tracks.length > 0 && <SetSummary tracks={tracks} />}

            <TrackTable tracks={tracks} onMoveUp={moveUp} onMoveDown={moveDown} onRemove={removeTrack} />
          </section>
        </main>
      </div>
    </div>
  )
}
