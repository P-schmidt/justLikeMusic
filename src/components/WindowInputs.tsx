import { useEffect, useState } from 'react'
import { formatTimeInput, parseTimeInput } from '../lib/timeInput'

interface WindowInputsProps {
  idPrefix: string
  label: string
  startSeconds: number | null
  endSeconds: number | null
  durationSeconds: number | null
  /** Show a single cue timestamp instead of start/end. */
  point?: boolean
  accentClassName?: string
  onChange: (
    startSeconds: number,
    endSeconds: number,
  ) => { errors: string[]; range: { startSeconds: number; endSeconds: number } }
}

const INPUT_CLASS =
  'w-20 rounded-md border bg-slate-950 px-2 py-1 font-mono text-xs tabular-nums text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-40'

export function WindowInputs({
  idPrefix,
  label,
  startSeconds,
  endSeconds,
  durationSeconds,
  point = false,
  accentClassName = 'focus-visible:outline-fuchsia-400',
  onChange,
}: WindowInputsProps) {
  const ready = durationSeconds !== null
  const [startValue, setStartValue] = useState('')
  const [endValue, setEndValue] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    if (startSeconds !== null) {
      setStartValue(formatTimeInput(startSeconds))
    }
    if (endSeconds !== null) {
      setEndValue(formatTimeInput(endSeconds))
    }
    setErrors([])
  }, [startSeconds, endSeconds])

  const commitRange = (nextStart: string, nextEnd: string) => {
    const parsedStart = parseTimeInput(nextStart)
    const parsedEnd = parseTimeInput(nextEnd)

    if (parsedStart === null || parsedEnd === null) {
      setErrors(['Use MM:SS format, for example 1:30'])
      return
    }

    const result = onChange(parsedStart, parsedEnd)
    setErrors(result.errors)
    setStartValue(formatTimeInput(result.range.startSeconds))
    setEndValue(formatTimeInput(result.range.endSeconds))
  }

  const commitPoint = (nextValue: string) => {
    const parsed = parseTimeInput(nextValue)

    if (parsed === null) {
      setErrors(['Use MM:SS format, for example 1:30'])
      return
    }

    const result = onChange(parsed, parsed)
    setErrors(result.errors)
    setStartValue(formatTimeInput(result.range.startSeconds))
  }

  const handleBlur = () => {
    if (!ready) {
      return
    }
    if (point) {
      commitPoint(startValue)
      return
    }
    commitRange(startValue, endValue)
  }

  if (point) {
    return (
      <div className="space-y-2">
        <label className="space-y-1" htmlFor={`${idPrefix}-cue`}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
          <input
            id={`${idPrefix}-cue`}
            type="text"
            inputMode="numeric"
            placeholder="0:00"
            className={`${INPUT_CLASS} ${accentClassName} ${errors.length > 0 ? 'border-rose-500/70' : 'border-slate-700'}`}
            value={startValue}
            disabled={!ready}
            aria-invalid={errors.length > 0}
            onChange={(event) => setStartValue(event.target.value)}
            onBlur={handleBlur}
          />
        </label>

        {errors.length > 0 && (
          <p className="text-xs text-rose-400" role="alert">
            {errors.join(' · ')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-1" htmlFor={`${idPrefix}-start`}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label} start</span>
          <input
            id={`${idPrefix}-start`}
            type="text"
            inputMode="numeric"
            placeholder="0:00"
            className={`${INPUT_CLASS} ${accentClassName} ${errors.length > 0 ? 'border-rose-500/70' : 'border-slate-700'}`}
            value={startValue}
            disabled={!ready}
            aria-invalid={errors.length > 0}
            onChange={(event) => setStartValue(event.target.value)}
            onBlur={handleBlur}
          />
        </label>

        <label className="space-y-1" htmlFor={`${idPrefix}-end`}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label} end</span>
          <input
            id={`${idPrefix}-end`}
            type="text"
            inputMode="numeric"
            placeholder="0:00"
            className={`${INPUT_CLASS} ${accentClassName} ${errors.length > 0 ? 'border-rose-500/70' : 'border-slate-700'}`}
            value={endValue}
            disabled={!ready}
            aria-invalid={errors.length > 0}
            onChange={(event) => setEndValue(event.target.value)}
            onBlur={handleBlur}
          />
        </label>
      </div>

      {errors.length > 0 && (
        <p className="text-xs text-rose-400" role="alert">
          {errors.join(' · ')}
        </p>
      )}
    </div>
  )
}
