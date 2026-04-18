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
