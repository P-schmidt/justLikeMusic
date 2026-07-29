import { Buffer } from 'buffer'
import process from 'process'

// music-metadata-browser streams tags through readable-stream, which reaches for
// Node's `Buffer` and `process` globals at runtime. Import this module before
// anything that touches the parser.
const globalScope = globalThis as typeof globalThis & {
  Buffer?: typeof Buffer
  process?: typeof process
}

globalScope.Buffer ??= Buffer
globalScope.process ??= process
