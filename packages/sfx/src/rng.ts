import type { JitterOptions } from './types'

const UINT32_MAX = 0x1_0000_0000

const normalizeSeed = (seed: number): number => seed >>> 0

export const createRng = (seed?: number): (() => number) => {
  if (seed === undefined) {
    return () => Math.random()
  }

  let state = normalizeSeed(seed)

  return () => {
    state = (state + 0x6d2b79f5) >>> 0

    let mixed = Math.imul(state ^ (state >>> 15), state | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)

    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_MAX
  }
}

export const createJitter = ({
  seed,
  variation,
}: JitterOptions): ((baseline: number, range: number) => number) => {
  if (variation === 0) {
    return (baseline: number) => baseline
  }

  const rng = createRng(seed)

  return (baseline: number, range: number) =>
    baseline + (rng() * 2 - 1) * range * variation
}
