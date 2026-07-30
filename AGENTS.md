# AGENTS.md

## Cursor Cloud specific instructions

`justLikeMusic` ("Mix Sequencer") is a single-page, browser-only app — there is no
backend, database, or external service. All audio decoding, tag reading, and beat
detection happen locally in the browser via the Web Audio API. Nothing is uploaded.

Standard commands live in `package.json` (`dev`, `build`, `lint`, `test`) and are
documented in the README "Development" section. Package manager is npm
(`package-lock.json`). Node 22 is required (Vite 8 / TypeScript 6 need Node 22.12+).

Non-obvious notes:
- `npm run dev` serves on http://localhost:5173. It is a Vite dev server; there is
  nothing else to start.
- `npm run lint` uses `oxlint` (not ESLint).
- `npm run build` runs `tsc -b` then `vite build`. The build prints an `[EVAL]`
  warning coming from the `file-type` dependency (used transitively by
  `music-metadata-browser`); it is a warning, not an error, and the build succeeds.
- Beat detection only locks onto real music with a sustained steady beat. Synthetic
  tones / click tracks / short clips commonly report "No steady beat found" — this is
  expected behavior, not a bug. Everything else about such a track stays usable.
- `music-metadata-browser` needs Node globals in the browser: `src/polyfills.ts`
  supplies `Buffer`/`process` and must stay imported first in `src/main.tsx`, and
  `global` is mapped to `globalThis` in `vite.config.ts`.
