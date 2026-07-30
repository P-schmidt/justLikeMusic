import { useEffect, useState } from 'react'
import { formatTimeInput, parseTimeInput } from '../lib/timeInput'
import type { Track } from '../types'

interface TransitionInputsProps {
  track: Track
  onChange: (
    id: string,
    startSeconds: number,
    endSeconds: number,
  ) => { errors: string[]; range: { startSeconds: number; endSeconds: number } }
}

const INPUT_CLASS =
  'w-24 rounded-md border bg-slate-950 px-2 py-1 font-mono text-xs tabular-nums text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-40'

export function TransitionInputs({ track, onChange }: TransitionInputsProps) {
  const ready = track.durationSeconds !== null
  const canSnap = track.bpm !== null && track.beatOffsetSeconds !== null
  const [startValue, setStartValue] = useState('')
  const [endValue, setEndValue] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    if (track.transitionStartSeconds !== null) {
      setStartValue(formatTimeInput(track.transitionStartSeconds))
    }
    if (track.transitionEndSeconds !== null) {
      setEndValue(formatTimeInput(track.transitionEndSeconds))
    }
  }, [track.transitionStartSeconds, track.transitionEndSeconds])

  const commit = (nextStart: string, nextEnd: string) => {
    const startSeconds = parseTimeInput(nextStart)
    const endSeconds = parseTimeInput(nextEnd)

    if (startSeconds === null || endSeconds === null) {
      setErrors(['Use M:SS or M:SS.d, for example 1:30.5'])
      return
    }

    const result = onChange(track.id, startSeconds, endSeconds)
    setErrors(result.errors)
    setStartValue(formatTimeInput(result.range.startSeconds))
    setEndValue(formatTimeInput(result.range.endSeconds))
  }

  const handleBlur = () => {
    if (!ready) {
      return
    }
    commit(startValue, endValue)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-1" htmlFor={`${track.id}-transition-start`}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Transition start</span>
          <input
            id={`${track.id}-transition-start`}
            type="text"
            inputMode="decimal"
            placeholder="0:00.0"
            className={`${INPUT_CLASS} ${errors.length > 0 ? 'border-rose-500/70' : 'border-slate-700'}`}
            value={startValue}
            disabled={!ready}
            aria-invalid={errors.length > 0}
            onChange={(event) => setStartValue(event.target.value)}
            onBlur={handleBlur}
          />
        </label>

        <label className="space-y-1" htmlFor={`${track.id}-transition-end`}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Transition end</span>
          <input
            id={`${track.id}-transition-end`}
            type="text"
            inputMode="decimal"
            placeholder="0:00.0"
            className={`${INPUT_CLASS} ${errors.length > 0 ? 'border-rose-500/70' : 'border-slate-700'}`}
            value={endValue}
            disabled={!ready}
            aria-invalid={errors.length > 0}
            onChange={(event) => setEndValue(event.target.value)}
            onBlur={handleBlur}
          />
        </label>

        {track.durationSeconds !== null && (
          <span className="pb-1 text-xs text-slate-500">
            Track length {formatTimeInput(track.durationSeconds)}
            {canSnap ? ' · snaps to bars' : ''}
          </span>
        )}
      </div>

      {errors.length > 0 && (
        <p className="text-xs text-rose-400" role="alert">
          {errors.join(' · ')}
        </p>
      )}
    </div>
  )
}
