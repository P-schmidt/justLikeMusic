# justLikeMusic

An automated song mix sequencer that runs entirely in the browser. Drop in local
audio files and each one is tagged and beat-analyzed automatically, then arrange
the running order of the set.

## Setup screen

- **Drag-and-drop zone** — drop any number of audio files at once, or click to
  pick them from the file dialog. Non-audio files are filtered out and files
  already in the set are skipped, both reported in a notice under the zone.
- **Ordered track table** — sequence number, track title, artist, genre, Camelot key,
  estimated BPM, plus the decoded length and file size under each title. Keys are read
  from embedded `TKEY` / initial-key tags (Mixed In Key, Rekordbox, etc.) and converted
  to Camelot notation when needed.
- **Transition windows** — per-track `Transition start` and `Transition end` inputs in
  `M:SS` format, validated against the track length, with a mini-waveform strip below
  each row highlighting the chosen mix-out region.
- **Reordering** — per-row up/down buttons (disabled at the ends of the list) and
  a remove button. Sequence numbers follow the running order.

## How analysis works

Every queued file goes through the same pipeline:

1. [`music-metadata-browser`](https://github.com/Borewit/music-metadata-browser)
   reads the ID3/Vorbis/MP4 tags for title, artist and genre. Missing or
   unreadable tags fall back to the filename and `Unknown` placeholders instead
   of failing the track.
2. The file is decoded with the Web Audio API to get an `AudioBuffer` and the
   track length.
3. [`web-audio-beat-detector`](https://github.com/chrisguttandin/web-audio-beat-detector)
   estimates the tempo from a 30-second window in the middle of the track. That is
   both faster and more accurate than analyzing the whole file: the detector builds
   a single interval histogram over whatever audio it is handed, so intros, outros
   and breakdowns drag the estimate away from the real tempo. On a 12-minute test
   track, the full buffer came back as 136.8 BPM while the middle window returned
   the correct 124.1, ten times quicker.

Tags are applied to the row before beat detection starts, so the table fills in
progressively. Analysis runs through a small concurrency limiter, so dropping a
whole folder in at once does not lock up the UI. When no steady beat can be
found, the row says so in place of a tempo and everything else about it stays
usable.

Nothing is uploaded anywhere — decoding and analysis both happen locally.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck and build for production
npm run test     # unit tests for the pure helpers
npm run lint
```

### A note on the Node polyfills

`music-metadata-browser` streams tags through `readable-stream`, which expects
Node's `Buffer`, `process` and `global` to exist. `src/polyfills.ts` supplies the
first two and is imported before anything else in `src/main.tsx`; `global` is
mapped to `globalThis` in `vite.config.ts`. Both the tag parser and the beat
detector are pulled in with dynamic imports so they are only downloaded once a
file is actually queued.
