export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) {
    return '--:--'
  }

  const total = Math.round(seconds)
  const minutes = Math.floor(total / 60)
  const remainder = total % 60

  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

/** Total set runtime, as `1h 04m` or `12m 30s`. */
export function formatTotalDuration(seconds: number): string {
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`
  }

  return `${minutes}m ${String(total % 60).padStart(2, '0')}s`
}

export function formatBpm(bpm: number | null): string {
  return bpm === null ? '--' : bpm.toFixed(1)
}

export function formatFileSize(bytes: number): string {
  const megabytes = bytes / 1024 / 1024
  return megabytes < 0.1 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${megabytes.toFixed(1)} MB`
}
