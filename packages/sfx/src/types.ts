export interface JitterOptions {
  readonly seed?: number
  readonly variation: number
}

export interface WavData {
  readonly channels: Array<Float32Array>
  readonly sampleRate: number
}
