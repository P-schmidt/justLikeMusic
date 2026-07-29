/**
 * Returns a copy of `items` with the entry at `from` moved to `to`. Out-of-range
 * targets return the original array so callers can no-op safely at the edges.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length || to < 0 || to >= items.length) {
    return items as T[]
  }

  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)

  return next
}
