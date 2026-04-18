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

export interface HelperVariationOptions {
  readonly seed?: number
  readonly variation?: number
}

export interface GunshotOptions extends HelperVariationOptions {
  readonly caliber?: 'light' | 'medium' | 'heavy'
  readonly suppressed?: boolean
  readonly tailMs?: number
}

export interface ExplosionOptions extends HelperVariationOptions {
  readonly size?: 'small' | 'medium' | 'large'
  readonly distance?: number
}

export interface CoinPickupOptions extends HelperVariationOptions {
  readonly pitch?: number
  readonly brightness?: number
}

export interface LaserShotOptions extends HelperVariationOptions {
  readonly pitch?: number
  readonly sweep?: 'up' | 'down' | 'none'
}

export interface JumpOptions extends HelperVariationOptions {
  readonly character?: 'light' | 'medium' | 'heavy'
}

export interface HitOptions extends HelperVariationOptions {
  readonly material?: 'flesh' | 'wood' | 'metal' | 'stone'
  readonly impact?: 'soft' | 'hard'
}

export interface FootstepOptions extends HelperVariationOptions {
  readonly surface?: 'grass' | 'wood' | 'stone' | 'metal' | 'water'
}

export interface PowerUpOptions extends HelperVariationOptions {
  readonly style?: 'arcade' | 'modern' | 'magical'
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
