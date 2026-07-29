import { describe, expect, it } from 'vitest'
import { keyToCamelot } from './camelot'

describe('keyToCamelot', () => {
  it('passes through valid Camelot codes', () => {
    expect(keyToCamelot('8A')).toEqual({ camelot: '8A', raw: '8A' })
    expect(keyToCamelot(' 12b ')).toEqual({ camelot: '12B', raw: '12b' })
  })

  it('converts standard minor and major spellings', () => {
    expect(keyToCamelot('Am')).toEqual({ camelot: '8A', raw: 'Am' })
    expect(keyToCamelot('A minor')).toEqual({ camelot: '8A', raw: 'A minor' })
    expect(keyToCamelot('F# minor')).toEqual({ camelot: '11A', raw: 'F# minor' })
    expect(keyToCamelot('Gb major')).toEqual({ camelot: '2B', raw: 'Gb major' })
    expect(keyToCamelot('E')).toEqual({ camelot: '9A', raw: 'E' })
  })

  it('converts Traktor Open Key notation', () => {
    expect(keyToCamelot('1m')).toEqual({ camelot: '8A', raw: '1m' })
    expect(keyToCamelot('8m')).toEqual({ camelot: '3A', raw: '8m' })
    expect(keyToCamelot('12d')).toEqual({ camelot: '7B', raw: '12d' })
  })

  it('returns null for empty or unrecognized values', () => {
    expect(keyToCamelot(null)).toBeNull()
    expect(keyToCamelot('')).toBeNull()
    expect(keyToCamelot('not a key')).toBeNull()
    expect(keyToCamelot('13A')).toBeNull()
  })
})
