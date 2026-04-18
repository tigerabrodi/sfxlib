import { createRng } from '../../rng'
import { clamp } from '../../utils'
import type { Sfx } from '../../Sfx'
import type {
  HelperVariationOptions,
  SfxNoiseOptions,
  SfxOscillatorOptions,
  SfxSilenceOptions,
} from '../../types'

const UINT32_MAX = 0x1_0000_0000

const toSeed = (value: number): number => Math.floor(value * UINT32_MAX) >>> 0

export interface HelperSfxApi {
  readonly sine: (options: SfxOscillatorOptions) => Sfx
  readonly square: (options: SfxOscillatorOptions) => Sfx
  readonly saw: (options: SfxOscillatorOptions) => Sfx
  readonly triangle: (options: SfxOscillatorOptions) => Sfx
  readonly noise: (options: SfxNoiseOptions) => Sfx
  readonly silence: (options: SfxSilenceOptions) => Sfx
  readonly mix: (others: Array<Sfx>) => Sfx
  readonly concat: (others: Array<Sfx>) => Sfx
}

export interface HelperVariationState {
  readonly amount: number
  readonly jitter: (baseline: number, range: number) => number
  readonly nextSeed: () => number
}

export const createHelperVariation = ({
  seed,
  variation = 0.5,
}: HelperVariationOptions = {}): HelperVariationState => {
  const amount = clamp(variation, 0, 1)

  if (amount === 0) {
    let next = 1

    return {
      amount,
      jitter: (baseline: number) => baseline,
      nextSeed: () => next++,
    }
  }

  const rng = createRng(seed ?? toSeed(Math.random()))

  return {
    amount,
    jitter: (baseline: number, range: number) =>
      baseline + (rng() * 2 - 1) * range * amount,
    nextSeed: () => toSeed(rng()),
  }
}
