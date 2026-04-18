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
