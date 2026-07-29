/** A position on the Camelot wheel, e.g. `{ number: 8, letter: 'A' }` → 8A. */
export interface CamelotPosition {
  number: number
  letter: 'A' | 'B'
}

const PITCH_CLASS: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
}

/** Minor (inner) ring — pitch class 0..11 → Camelot hour 1..12. */
const CAMELOT_MINOR_NUMBER: Record<number, number> = {
  0: 5,
  1: 12,
  2: 7,
  3: 2,
  4: 9,
  5: 4,
  6: 11,
  7: 6,
  8: 1,
  9: 8,
  10: 3,
  11: 10,
}

/** Major (outer) ring — pitch class 0..11 → Camelot hour 1..12. */
const CAMELOT_MAJOR_NUMBER: Record<number, number> = {
  0: 8,
  1: 3,
  2: 10,
  3: 5,
  4: 12,
  5: 7,
  6: 2,
  7: 9,
  8: 4,
  9: 11,
  10: 6,
  11: 1,
}

const NOTE = String.raw`[A-Ga-g](?:#|♯|b|♭)?`
const CAMELOT_PATTERN = /^\s*(\d{1,2})\s*([ABab])\s*$/
const OPEN_KEY_PATTERN = /^\s*(\d{1,2})\s*([md])\s*$/
const KEY_WITH_QUALITY = new RegExp(String.raw`^\s*(${NOTE})\s*(?:[-\s]+)?(major|minor|maj|min|m)\s*$`, 'i')
const KEY_ONLY = new RegExp(String.raw`^\s*(${NOTE})\s*$`)

/** Traktor Open Key uses the same wheel with a +7 hour offset from Camelot numbering. */
function openKeyToCamelot(openKey: number, isMinor: boolean): string | null {
  if (openKey < 1 || openKey > 12) {
    return null
  }

  let number = openKey + 7
  if (number > 12) {
    number -= 12
  }

  return `${number}${isMinor ? 'A' : 'B'}`
}

function normalizeNote(raw: string): string | null {
  const letter = raw.charAt(0).toUpperCase()
  const accidental = raw.slice(1).replace(/♯/g, '#').replace(/♭/g, 'b')
  const note = letter + accidental

  return note in PITCH_CLASS ? note : null
}

function pitchClass(note: string): number | null {
  return PITCH_CLASS[note] ?? null
}

export function toCamelotCode(position: CamelotPosition): string {
  return `${position.number}${position.letter}`
}

export function toCamelot(pitch: number, isMinor: boolean): CamelotPosition {
  const number = (isMinor ? CAMELOT_MINOR_NUMBER : CAMELOT_MAJOR_NUMBER)[pitch] ?? 1
  return { number, letter: isMinor ? 'A' : 'B' }
}

/**
 * Converts DJ tag key strings to Camelot notation. Accepts values already in
 * Camelot (8A), Traktor Open Key (1m / 12d), or standard spelling (Am, F# minor).
 */
export function keyToCamelot(raw: string | null | undefined): { camelot: string; raw: string } | null {
  if (!raw?.trim()) {
    return null
  }

  const trimmed = raw.trim()

  const camelotMatch = CAMELOT_PATTERN.exec(trimmed)
  if (camelotMatch) {
    const number = Number(camelotMatch[1])
    if (number >= 1 && number <= 12) {
      const letter = camelotMatch[2].toUpperCase() as 'A' | 'B'
      return { camelot: `${number}${letter}`, raw: trimmed }
    }
  }

  const openKeyMatch = OPEN_KEY_PATTERN.exec(trimmed)
  if (openKeyMatch) {
    const mapped = openKeyToCamelot(Number(openKeyMatch[1]), openKeyMatch[2] === 'm')
    if (mapped) {
      return { camelot: mapped, raw: trimmed }
    }
  }

  const withQuality = KEY_WITH_QUALITY.exec(trimmed)
  if (withQuality) {
    const note = normalizeNote(withQuality[1])
    const pitch = note ? pitchClass(note) : null
    if (pitch !== null) {
      const quality = withQuality[2].toLowerCase()
      const isMinor = quality === 'm' || quality.startsWith('min')
      return { camelot: toCamelotCode(toCamelot(pitch, isMinor)), raw: trimmed }
    }
  }

  const noteOnly = KEY_ONLY.exec(trimmed)
  if (noteOnly) {
    const note = normalizeNote(noteOnly[1])
    const pitch = note ? pitchClass(note) : null
    if (pitch !== null) {
      // Bare note names in DJ tags are almost always minor.
      return { camelot: toCamelotCode(toCamelot(pitch, true)), raw: trimmed }
    }
  }

  return null
}
