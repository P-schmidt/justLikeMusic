import type { Track } from '../types'
import { decodeAudioFile, getAudioContext } from './audio'
import { equalPowerCurve } from './equalPower'
import {
  buildMixPlan,
  EMPTY_MIX_PLAN,
  firstChangedIndex,
  segmentsAt,
  segmentSignature,
  type MixPlan,
  type MixSegment,
} from './mixPlan'

/** How far ahead of the playhead sources are created and scheduled. */
const LOOKAHEAD_SECONDS = 20
const SCHEDULER_INTERVAL_MS = 250
/** Small lead so the first source starts cleanly rather than mid-quantum. */
const START_LEAD_SECONDS = 0.08
/** Keeps a curve from starting exactly where the previous one ends. */
const AUTOMATION_GUARD_SECONDS = 0.001
const DECODED_CACHE_LIMIT = 4

interface ScheduledSource {
  segment: MixSegment
  source: AudioBufferSourceNode
  gain: GainNode
}

export interface MixSnapshot {
  isPlaying: boolean
  position: number
  duration: number
  /** Tracks currently audible — two of them while a crossfade is running. */
  activeTrackIds: string[]
  canPlay: boolean
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Sequences the queue into one continuous stream.
 *
 * Every track gets its own `AudioBufferSourceNode` and `GainNode`, started at an
 * absolute time on the shared `AudioContext` clock, so transitions land exactly
 * where the plan says rather than depending on timer accuracy. A polling loop only
 * decides what to *create*; once a source is started the crossfade is fully
 * described by automation events on its gain.
 */
export class MixEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private plan: MixPlan = EMPTY_MIX_PLAN
  private files = new Map<string, File>()
  private buffers = new Map<string, AudioBuffer>()
  private decoding = new Map<string, Promise<AudioBuffer>>()
  private scheduled = new Map<string, ScheduledSource>()
  private pending = new Set<string>()
  private timer: ReturnType<typeof setInterval> | null = null
  private listeners = new Set<() => void>()

  /** Bumped whenever the transport jumps, invalidating in-flight scheduling. */
  private generation = 0
  private playing = false
  private anchorMix = 0
  private anchorContextTime = 0
  private pausedAt = 0

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot(): MixSnapshot {
    const position = this.position

    return {
      isPlaying: this.playing,
      position,
      duration: this.plan.totalDuration,
      activeTrackIds: segmentsAt(this.plan, position).map((segment) => segment.trackId),
      canPlay: this.plan.segments.length > 0,
    }
  }

  /** Master output, for metering or analysis. `null` until playback first starts. */
  getOutput(): GainNode | null {
    return this.master
  }

  get position(): number {
    if (!this.playing || !this.context) {
      return this.pausedAt
    }

    const elapsed = Math.max(0, this.context.currentTime - this.anchorContextTime)
    return Math.min(this.plan.totalDuration, this.anchorMix + elapsed)
  }

  /** Rebuilds the plan from the queue, preserving playback where it still applies. */
  sync(tracks: Track[]): void {
    for (const track of tracks) {
      this.files.set(track.id, track.file)
    }

    const next = buildMixPlan(tracks)
    const changedFrom = firstChangedIndex(this.plan.segments, next.segments)
    this.plan = next

    if (changedFrom === null) {
      return
    }

    if (this.playing) {
      this.teardownFrom(changedFrom)

      if (this.position >= next.totalDuration) {
        this.finish()
        return
      }

      this.runScheduler()
    } else {
      this.pausedAt = clamp(this.pausedAt, 0, next.totalDuration)
    }

    this.notify()
  }

  async play(): Promise<void> {
    if (this.plan.segments.length === 0 || this.playing) {
      return
    }

    const context = this.ensureContext()
    if (context.state === 'suspended') {
      await context.resume()
    }

    const from = this.pausedAt >= this.plan.totalDuration ? 0 : this.pausedAt
    this.startAt(from)
  }

  pause(): void {
    if (!this.playing) {
      return
    }

    this.pausedAt = this.position
    this.playing = false
    this.generation += 1
    this.teardownAll()
    this.stopTimer()
    this.notify()
  }

  seek(position: number): void {
    const target = clamp(position, 0, this.plan.totalDuration)

    if (this.playing) {
      this.startAt(target)
    } else {
      this.pausedAt = target
      this.notify()
    }
  }

  dispose(): void {
    this.generation += 1
    this.playing = false
    this.teardownAll()
    this.stopTimer()
    this.listeners.clear()
    this.buffers.clear()
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = getAudioContext()
      this.master = this.context.createGain()
      this.master.connect(this.context.destination)
    }

    return this.context
  }

  private startAt(position: number): void {
    const context = this.ensureContext()

    this.generation += 1
    this.teardownAll()

    this.playing = true
    this.pausedAt = position
    this.anchorMix = position
    this.anchorContextTime = context.currentTime + START_LEAD_SECONDS

    this.runScheduler()
    this.startTimer()
    this.notify()
  }

  private finish(): void {
    this.generation += 1
    this.playing = false
    this.pausedAt = this.plan.totalDuration
    this.teardownAll()
    this.stopTimer()
    this.notify()
  }

  private startTimer(): void {
    this.stopTimer()
    this.timer = setInterval(() => this.runScheduler(), SCHEDULER_INTERVAL_MS)
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private runScheduler(): void {
    if (!this.playing) {
      return
    }

    const position = this.position

    if (position >= this.plan.totalDuration) {
      this.finish()
      return
    }

    const horizon = position + LOOKAHEAD_SECONDS

    for (const segment of this.plan.segments) {
      if (segment.startTime > horizon) {
        break
      }
      if (segment.startTime + segment.localEnd <= position) {
        continue
      }
      if (this.scheduled.has(segment.trackId) || this.pending.has(segment.trackId)) {
        continue
      }

      void this.scheduleSegment(segment, this.generation)
    }
  }

  private async scheduleSegment(segment: MixSegment, generation: number): Promise<void> {
    this.pending.add(segment.trackId)

    try {
      const buffer = await this.loadBuffer(segment.trackId)

      const current = this.plan.segments[segment.index]
      const stillValid =
        this.playing && generation === this.generation && current && segmentSignature(current) === segmentSignature(segment)

      if (stillValid) {
        this.startSource(segment, buffer)
      }
    } catch {
      // A track that will not decode is skipped so the rest of the mix still runs.
    } finally {
      this.pending.delete(segment.trackId)
    }
  }

  private startSource(segment: MixSegment, buffer: AudioBuffer): void {
    const context = this.context
    const master = this.master
    if (!context || !master) {
      return
    }

    const localOffset = Math.max(0, this.position - segment.startTime)
    const playDuration = segment.localEnd - localOffset
    if (playDuration <= 0) {
      return
    }

    const toContextTime = (mixTime: number) => this.anchorContextTime + (mixTime - this.anchorMix)
    const when = Math.max(context.currentTime, toContextTime(segment.startTime + localOffset))

    const gain = context.createGain()
    gain.connect(master)

    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(gain)

    this.applyCrossfade(gain.gain, segment, localOffset, when, toContextTime)

    source.onended = () => {
      if (this.scheduled.get(segment.trackId)?.source === source) {
        this.scheduled.delete(segment.trackId)
      }
      gain.disconnect()
    }

    source.start(when, localOffset, playDuration)
    this.scheduled.set(segment.trackId, { segment, source, gain })
  }

  /**
   * Writes the whole fade-in/fade-out shape for one track as automation events.
   *
   * `localOffset` is where playback joins the track, which is 0 for a normal
   * transition but can land inside either fade after a seek. Each branch emits at
   * most one curve starting at `when`, because a `setValueCurveAtTime` throws if
   * another event sits inside its window.
   */
  private applyCrossfade(
    param: AudioParam,
    segment: MixSegment,
    localOffset: number,
    when: number,
    toContextTime: (mixTime: number) => number,
  ): void {
    const { fadeInDuration, fadeOutStart, fadeOutEnd } = segment
    const overlap = fadeOutStart !== null && fadeOutEnd !== null ? fadeOutEnd - fadeOutStart : 0

    // Joining while the track is already fading out: only the tail is left.
    if (fadeOutStart !== null && fadeOutEnd !== null && overlap > 0 && localOffset >= fadeOutStart) {
      const progress = (localOffset - fadeOutStart) / overlap
      param.setValueCurveAtTime(equalPowerCurve('out', progress, 1), when, fadeOutEnd - localOffset)
      return
    }

    let fadeInEnd = when

    if (fadeInDuration > 0 && localOffset < fadeInDuration) {
      const remaining = fadeInDuration - localOffset
      param.setValueCurveAtTime(equalPowerCurve('in', localOffset / fadeInDuration, 1), when, remaining)
      fadeInEnd = when + remaining
    } else {
      param.setValueAtTime(1, when)
    }

    if (fadeOutStart === null || overlap <= 0) {
      // Final track, or a hard cut where the source simply stops at localEnd.
      return
    }

    const fadeOutAt = Math.max(fadeInEnd + AUTOMATION_GUARD_SECONDS, toContextTime(segment.startTime + fadeOutStart))
    param.setValueCurveAtTime(equalPowerCurve('out'), fadeOutAt, overlap)
  }

  private async loadBuffer(trackId: string): Promise<AudioBuffer> {
    const cached = this.buffers.get(trackId)
    if (cached) {
      // Re-insert to keep Map iteration order as least-recently-used first.
      this.buffers.delete(trackId)
      this.buffers.set(trackId, cached)
      return cached
    }

    const inFlight = this.decoding.get(trackId)
    if (inFlight) {
      return inFlight
    }

    const file = this.files.get(trackId)
    if (!file) {
      throw new Error('Track file is no longer available')
    }

    const promise = decodeAudioFile(file)
      .then((buffer) => {
        this.buffers.set(trackId, buffer)
        this.trimCache()
        return buffer
      })
      .finally(() => {
        this.decoding.delete(trackId)
      })

    this.decoding.set(trackId, promise)
    return promise
  }

  /** Decoded audio is large, so only a short window around the playhead is kept. */
  private trimCache(): void {
    while (this.buffers.size > DECODED_CACHE_LIMIT) {
      const oldest = this.buffers.keys().next().value
      if (oldest === undefined) {
        break
      }
      this.buffers.delete(oldest)
    }
  }

  private teardownAll(): void {
    for (const trackId of [...this.scheduled.keys()]) {
      this.stopScheduled(trackId)
    }
  }

  private teardownFrom(index: number): void {
    for (const [trackId, entry] of [...this.scheduled.entries()]) {
      if (entry.segment.index >= index) {
        this.stopScheduled(trackId)
      }
    }
  }

  private stopScheduled(trackId: string): void {
    const entry = this.scheduled.get(trackId)
    if (!entry) {
      return
    }

    this.scheduled.delete(trackId)
    entry.source.onended = null

    try {
      entry.source.stop()
    } catch {
      // Already stopped.
    }

    entry.source.disconnect()
    entry.gain.disconnect()
  }
}
