import { useEffect, useRef, useState } from 'react'
import { formatDuration } from '../lib/format'
import { PauseIcon, PlayIcon } from './icons'

interface MixPlayerBarProps {
  isPlaying: boolean
  position: number
  duration: number
  canPlay: boolean
  nowPlaying: string | null
  onPlay: () => void
  onPause: () => void
  onSeek: (position: number) => void
}

const TRANSPORT_BUTTON_CLASS =
  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-40'

export function MixPlayerBar({
  isPlaying,
  position,
  duration,
  canPlay,
  nowPlaying,
  onPlay,
  onPause,
  onSeek,
}: MixPlayerBarProps) {
  const [scrubPosition, setScrubPosition] = useState<number | null>(null)
  const isScrubbing = useRef(false)

  // Drop a stale scrub value if the transport moves on its own.
  useEffect(() => {
    if (!isScrubbing.current) {
      setScrubPosition(null)
    }
  }, [position])

  const displayed = scrubPosition ?? position
  const progress = duration > 0 ? (displayed / duration) * 100 : 0

  const commit = (value: number) => {
    isScrubbing.current = false
    setScrubPosition(null)
    onSeek(value)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`${TRANSPORT_BUTTON_CLASS} bg-fuchsia-500 text-white hover:enabled:bg-fuchsia-400`}
            onClick={onPlay}
            disabled={!canPlay || isPlaying}
          >
            <PlayIcon className="size-4" />
            Play Mix
          </button>
          <button
            type="button"
            className={`${TRANSPORT_BUTTON_CLASS} border border-slate-700 text-slate-200 hover:enabled:border-slate-500 hover:enabled:bg-slate-800`}
            onClick={onPause}
            disabled={!isPlaying}
          >
            <PauseIcon className="size-4" />
            Pause Mix
          </button>
        </div>

        <div className="flex min-w-64 flex-1 items-center gap-3">
          <span className="font-mono text-xs tabular-nums text-slate-400">{formatDuration(displayed)}</span>

          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-fuchsia-500" style={{ width: `${progress}%` }} />
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(duration, 0.1)}
              step={0.1}
              value={displayed}
              disabled={!canPlay}
              aria-label="Mix timeline"
              className="relative w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fuchsia-400 disabled:cursor-not-allowed [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              onPointerDown={() => {
                isScrubbing.current = true
              }}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (isScrubbing.current) {
                  setScrubPosition(value)
                } else {
                  commit(value)
                }
              }}
              onPointerUp={(event) => commit(Number(event.currentTarget.value))}
              onKeyUp={(event) => commit(Number(event.currentTarget.value))}
              onBlur={(event) => {
                if (isScrubbing.current) {
                  commit(Number(event.currentTarget.value))
                }
              }}
            />
          </div>

          <span className="font-mono text-xs tabular-nums text-slate-400">{formatDuration(duration)}</span>
        </div>

        <p className="min-w-40 truncate text-xs text-slate-400">
          {nowPlaying === null ? (
            <span className="text-slate-500">{canPlay ? 'Ready to play' : 'Add tracks to build a mix'}</span>
          ) : (
            <>
              <span className="text-slate-500">Now playing </span>
              <span className="text-slate-200">{nowPlaying}</span>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
