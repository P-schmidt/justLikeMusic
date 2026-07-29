import { useCallback, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { AUDIO_ACCEPT, SUPPORTED_FORMATS_LABEL } from '../lib/files'
import { UploadIcon } from './icons'

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void
}

export function DropZone({ onFilesSelected }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  // dragenter/dragleave also fire for child elements, so count them instead of
  // toggling a boolean.
  const dragDepth = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  const resetDrag = useCallback(() => {
    dragDepth.current = 0
    setIsDragging(false)
  }, [])

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepth.current += 1
    setIsDragging(true)
  }, [])

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      resetDrag()
    }
  }, [resetDrag])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      resetDrag()
      onFilesSelected(Array.from(event.dataTransfer.files))
    },
    [onFilesSelected, resetDrag],
  )

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-2xl border-2 border-dashed p-1 transition-colors ${
        isDragging ? 'border-fuchsia-400 bg-fuchsia-500/10' : 'border-slate-700 bg-slate-900/40'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={AUDIO_ACCEPT}
        className="hidden"
        onChange={(event) => {
          onFilesSelected(Array.from(event.target.files ?? []))
          // Allow re-picking the same file after it has been removed.
          event.target.value = ''
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl px-6 py-12 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-400"
      >
        <span
          className={`flex size-14 items-center justify-center rounded-full transition-colors ${
            isDragging ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-slate-800 text-slate-400'
          }`}
        >
          <UploadIcon className="size-6" />
        </span>

        <span className="text-lg font-semibold text-slate-100">
          {isDragging ? 'Drop to add to the set' : 'Drop audio files here'}
        </span>
        <span className="text-sm text-slate-400">
          or <span className="font-medium text-fuchsia-400 underline decoration-dotted">browse your library</span> —
          multiple files at once
        </span>
        <span className="text-xs text-slate-500">{SUPPORTED_FORMATS_LABEL}</span>
      </button>
    </div>
  )
}
