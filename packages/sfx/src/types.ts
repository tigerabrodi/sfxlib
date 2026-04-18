export interface JitterOptions {
  readonly seed?: number
  readonly variation: number
}

export interface WavData {
  readonly channels: Array<Float32Array>
  readonly sampleRate: number
}

export interface ConfigureOptions {
  readonly context?: AudioContext
  readonly defaultSampleRate?: number
}

export interface CreateOfflineContextOptions {
  readonly durationMs: number
  readonly sampleRate?: number
  readonly channels?: number
}

export interface SfxFromBufferOptions {
  readonly buffer: AudioBuffer
}

export interface SfxFromChannelsOptions {
  readonly channels: Array<Float32Array>
  readonly sampleRate?: number
}

export interface SfxSilenceOptions {
  readonly durationMs: number
  readonly sampleRate?: number
  readonly channels?: number
}

export interface SfxOscillatorOptions {
  readonly freq: number
  readonly durationMs: number
  readonly sampleRate?: number
}

export type NoiseType = 'white' | 'pink' | 'brown'

export interface SfxNoiseOptions {
  readonly durationMs: number
  readonly sampleRate?: number
  readonly seed?: number
  readonly type?: NoiseType
}

export interface GainOptions {
  readonly db: number
}

export interface FadeOptions {
  readonly ms: number
}

export interface SliceOptions {
  readonly startMs: number
  readonly endMs: number
}

export interface ResampleOptions {
  readonly sampleRate: number
}

export interface SpeedOptions {
  readonly rate: number
}

export interface EnvelopeOptions {
  readonly attackMs: number
  readonly decayMs: number
  readonly sustain: number
  readonly releaseMs: number
}

export interface FilterOptions {
  readonly cutoff: number
  readonly q?: number
}

export interface PitchOptions {
  readonly semitones: number
}

export interface DelayOptions {
  readonly timeMs: number
  readonly feedback: number
  readonly wet?: number
}

export interface ReverbOptions {
  readonly durationMs?: number
  readonly decay?: number
  readonly wet?: number
}

export interface DistortionOptions {
  readonly amount: number
}
