import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { BEATS_PER_BAR, iterateBeats } from '../lib/beatGrid'
import { clampTimeRange } from '../lib/timeInput'

export interface WaveformWindow {
  id: string
  label: string
  startSeconds: number | null
  endSeconds: number | null
  /** Single cue marker instead of a start/end range. */
  point?: boolean
  /** Tailwind classes for the highlight fill and border. */
  toneClassName: string
  handleClassName: string
  onChange: (startSeconds: number, endSeconds: number) => void
}

interface MiniWaveformProps {
  peaks: number[] | null
  durationSeconds: number | null
  bpm: number | null
  beatOffsetSeconds: number | null
  windows: WaveformWindow[]
}

type DragMode = 'move' | 'start' | 'end' | 'point'

interface DragState {
  windowId: string
  mode: DragMode
  /** Window length at pointer-down, used when dragging the body. */
  duration: number
  /** Offset from the grab point to the window start (move mode only). */
  grabOffsetSeconds: number
}

function secondsFromClientX(clientX: number, element: HTMLElement, durationSeconds: number): number {
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0) {
    return 0
  }
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  return ratio * durationSeconds
}

export function MiniWaveform({
  peaks,
  durationSeconds,
  bpm,
  beatOffsetSeconds,
  windows,
}: MiniWaveformProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [draft, setDraft] = useState<Record<string, { startSeconds: number; endSeconds: number }>>({})

  useEffect(() => {
    if (drag === null) {
      setDraft({})
    }
  }, [drag])

  if (peaks === null || peaks.length === 0) {
    return (
      <div
        className="flex h-14 w-full items-center justify-center rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-600"
        aria-hidden
      >
        Waveform loading…
      </div>
    )
  }

  const ready = durationSeconds !== null && durationSeconds > 0
  const barWidth = 100 / peaks.length

  const resolveWindow = (window: WaveformWindow) => {
    const draftRange = draft[window.id]
    if (draftRange) {
      return draftRange
    }
    if (window.point) {
      if (window.startSeconds === null) {
        return null
      }
      return { startSeconds: window.startSeconds, endSeconds: window.startSeconds }
    }
    if (window.startSeconds === null || window.endSeconds === null) {
      return null
    }
    return { startSeconds: window.startSeconds, endSeconds: window.endSeconds }
  }

  const beginDrag = (
    event: ReactPointerEvent<HTMLElement>,
    window: WaveformWindow,
    mode: DragMode,
    range: { startSeconds: number; endSeconds: number },
  ) => {
    if (!ready || durationSeconds === null || trackRef.current === null) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    trackRef.current.setPointerCapture(event.pointerId)

    const pointerSeconds = secondsFromClientX(event.clientX, trackRef.current, durationSeconds)
    setDrag({
      windowId: window.id,
      mode,
      duration: range.endSeconds - range.startSeconds,
      grabOffsetSeconds: pointerSeconds - range.startSeconds,
    })
    setDraft({ [window.id]: range })
  }

  const updateDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag === null || durationSeconds === null || trackRef.current === null) {
      return
    }

    const window = windows.find((entry) => entry.id === drag.windowId)
    if (!window) {
      return
    }

    const pointerSeconds = secondsFromClientX(event.clientX, trackRef.current, durationSeconds)
    let next: { startSeconds: number; endSeconds: number }

    if (drag.mode === 'point') {
      const time = Math.max(0, Math.min(pointerSeconds, durationSeconds))
      next = { startSeconds: time, endSeconds: time }
    } else if (drag.mode === 'move') {
      const start = pointerSeconds - drag.grabOffsetSeconds
      next = clampTimeRange(start, start + drag.duration, durationSeconds)
    } else if (drag.mode === 'start') {
      const end = draft[drag.windowId]?.endSeconds ?? pointerSeconds
      const start = Math.max(0, Math.min(pointerSeconds, end))
      next = { startSeconds: start, endSeconds: end }
    } else {
      const start = draft[drag.windowId]?.startSeconds ?? pointerSeconds
      const end = Math.min(durationSeconds, Math.max(pointerSeconds, start))
      next = { startSeconds: start, endSeconds: end }
    }

    setDraft({ [drag.windowId]: next })
    window.onChange(next.startSeconds, next.endSeconds)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag === null) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const window = windows.find((entry) => entry.id === drag.windowId)
    const range = draft[drag.windowId]
    if (window && range) {
      window.onChange(range.startSeconds, range.endSeconds)
    }

    setDrag(null)
  }

  const hasGrid =
    durationSeconds !== null &&
    durationSeconds > 0 &&
    bpm !== null &&
    bpm > 0 &&
    beatOffsetSeconds !== null

  const beatMarkers = hasGrid
    ? [...iterateBeats(bpm, beatOffsetSeconds, durationSeconds)].map((time, index) => ({
        time,
        isBar: index % BEATS_PER_BAR === 0,
        x: (time / durationSeconds) * 100,
      }))
    : []

  return (
    <div
      ref={trackRef}
      className={`relative h-14 w-full touch-none overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80 ${
        ready ? 'cursor-default' : ''
      }`}
      onPointerMove={updateDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
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
              className="fill-slate-600"
            />
          )
        })}

        {beatMarkers.map((marker) => (
          <line
            key={`beat-${marker.time}`}
            x1={marker.x}
            x2={marker.x}
            y1={marker.isBar ? 4 : 22}
            y2={marker.isBar ? 96 : 78}
            stroke={marker.isBar ? 'rgb(165 180 252)' : 'rgb(71 85 105)'}
            strokeWidth={marker.isBar ? 0.35 : 0.2}
            vectorEffect="non-scaling-stroke"
            opacity={marker.isBar ? 0.85 : 0.55}
          />
        ))}
      </svg>

      {ready &&
        windows.map((window) => {
          const range = resolveWindow(window)
          if (range === null || range.endSeconds < range.startSeconds || durationSeconds === null) {
            return null
          }

          const isDragging = drag?.windowId === window.id

          if (window.point) {
            const left = (range.startSeconds / durationSeconds) * 100

            return (
              <div
                key={window.id}
                className={`absolute inset-y-0 z-10 ${isDragging ? 'z-20' : ''}`}
                style={{ left: `${left}%` }}
              >
                <button
                  type="button"
                  aria-label={`${window.label} at ${range.startSeconds.toFixed(1)} seconds`}
                  className={`absolute inset-y-0 left-0 w-3 -translate-x-1/2 cursor-ew-resize touch-none ${window.handleClassName}`}
                  onPointerDown={(event) => beginDrag(event, window, 'point', range)}
                />
              </div>
            )
          }

          const left = (range.startSeconds / durationSeconds) * 100
          const width = ((range.endSeconds - range.startSeconds) / durationSeconds) * 100

          return (
            <div
              key={window.id}
              className={`absolute inset-y-0 ${window.toneClassName} ${isDragging ? 'z-20' : 'z-10'}`}
              style={{ left: `${left}%`, width: `${Math.max(width, 0.4)}%` }}
              role="group"
              aria-label={`${window.label} from ${range.startSeconds.toFixed(1)} to ${range.endSeconds.toFixed(1)} seconds${
                hasGrid ? ', snapped to bar boundaries' : ''
              }`}
            >
              <button
                type="button"
                aria-label={`Adjust ${window.label} start`}
                className={`absolute inset-y-0 left-0 z-10 w-2.5 -translate-x-1/2 cursor-ew-resize touch-none ${window.handleClassName}`}
                onPointerDown={(event) => beginDrag(event, window, 'start', range)}
              />
              <button
                type="button"
                aria-label={`Move ${window.label}`}
                className="absolute inset-y-0 right-2.5 left-2.5 cursor-grab touch-none active:cursor-grabbing"
                onPointerDown={(event) => beginDrag(event, window, 'move', range)}
              />
              <button
                type="button"
                aria-label={`Adjust ${window.label} end`}
                className={`absolute inset-y-0 right-0 z-10 w-2.5 translate-x-1/2 cursor-ew-resize touch-none ${window.handleClassName}`}
                onPointerDown={(event) => beginDrag(event, window, 'end', range)}
              />
            </div>
          )
        })}
    </div>
  )
}
