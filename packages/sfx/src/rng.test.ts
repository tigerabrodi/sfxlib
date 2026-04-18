import { describe, expect, it, vi } from 'vitest'

import { createJitter, createRng } from './rng'

describe('createRng', () => {
  it('returns the same sequence for the same seed', () => {
    const first = createRng(12345)
    const second = createRng(12345)

    const firstValues = Array.from({ length: 5 }, () => first())
    const secondValues = Array.from({ length: 5 }, () => second())

    expect(firstValues).toEqual(secondValues)
  })

  it('returns different sequences for different seeds', () => {
    const first = createRng(12345)
    const second = createRng(54321)

    const firstValues = Array.from({ length: 5 }, () => first())
    const secondValues = Array.from({ length: 5 }, () => second())

    expect(firstValues).not.toEqual(secondValues)
  })

  it('always stays in the range from zero up to but not including one', () => {
    const rng = createRng(42)

    for (let index = 0; index < 1000; index += 1) {
      const value = rng()

      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('falls back to Math.random when no seed is given', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.25)

    const rng = createRng()

    expect(rng()).toBe(0.25)
    expect(randomSpy).toHaveBeenCalledTimes(1)

    randomSpy.mockRestore()
  })
})

describe('createJitter', () => {
  it('returns the baseline unchanged when variation is zero', () => {
    const jitter = createJitter({ seed: 123, variation: 0 })

    expect(jitter(10, 5)).toBe(10)
    expect(jitter(7, 2)).toBe(7)
  })

  it('is deterministic for the same seed and variation', () => {
    const first = createJitter({ seed: 123, variation: 0.5 })
    const second = createJitter({ seed: 123, variation: 0.5 })

    const firstValues = [first(100, 20), first(30, 5), first(5, 0.5)]
    const secondValues = [second(100, 20), second(30, 5), second(5, 0.5)]

    expect(firstValues).toEqual(secondValues)
  })

  it('does not move outside the allowed variation range', () => {
    const jitter = createJitter({ seed: 42, variation: 0.75 })

    for (let index = 0; index < 100; index += 1) {
      const value = jitter(10, 4)

      expect(value).toBeGreaterThanOrEqual(7)
      expect(value).toBeLessThanOrEqual(13)
    }
  })
})
