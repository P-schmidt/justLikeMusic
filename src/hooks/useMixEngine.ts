import { useCallback, useEffect, useRef, useState } from 'react'
import { MixEngine, type MixSnapshot } from '../lib/mixEngine'
import type { Track } from '../types'

/**
 * Position updates drive the timeline slider and row highlighting. 10 Hz keeps the
 * readout smooth without re-rendering the whole table every frame.
 */
const POSITION_POLL_MS = 100

export function useMixEngine(tracks: Track[]) {
  const engineRef = useRef<MixEngine | null>(null)
  engineRef.current ??= new MixEngine()
  const engine = engineRef.current

  const [snapshot, setSnapshot] = useState<MixSnapshot>(() => engine.getSnapshot())

  useEffect(() => {
    const unsubscribe = engine.subscribe(() => setSnapshot(engine.getSnapshot()))
    return () => {
      unsubscribe()
      engine.dispose()
    }
  }, [engine])

  useEffect(() => {
    engine.sync(tracks)
    setSnapshot(engine.getSnapshot())
  }, [engine, tracks])

  useEffect(() => {
    if (!snapshot.isPlaying) {
      return
    }

    const timer = setInterval(() => setSnapshot(engine.getSnapshot()), POSITION_POLL_MS)
    return () => clearInterval(timer)
  }, [engine, snapshot.isPlaying])

  const play = useCallback(() => {
    void engine.play()
  }, [engine])

  const pause = useCallback(() => engine.pause(), [engine])
  const seek = useCallback((position: number) => engine.seek(position), [engine])

  return { ...snapshot, play, pause, seek }
}
