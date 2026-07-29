import { describe, expect, it } from 'vitest'
import { moveItem } from './reorder'

describe('moveItem', () => {
  const items = ['a', 'b', 'c', 'd']

  it('moves an entry up', () => {
    expect(moveItem(items, 2, 1)).toEqual(['a', 'c', 'b', 'd'])
  })

  it('moves an entry down', () => {
    expect(moveItem(items, 1, 2)).toEqual(['a', 'c', 'b', 'd'])
  })

  it('leaves the input untouched', () => {
    moveItem(items, 0, 3)
    expect(items).toEqual(['a', 'b', 'c', 'd'])
  })

  it('returns the same array when the move would fall off either end', () => {
    expect(moveItem(items, 0, -1)).toBe(items)
    expect(moveItem(items, 3, 4)).toBe(items)
    expect(moveItem(items, 1, 1)).toBe(items)
  })

  it('handles a single-item list', () => {
    const single = ['only']
    expect(moveItem(single, 0, -1)).toBe(single)
    expect(moveItem(single, 0, 1)).toBe(single)
  })
})
