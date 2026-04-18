import { describe, expect, it } from 'vitest'

import {
  clamp,
  dbToGain,
  gainToDb,
  msToSamples,
  samplesToMs,
  semitonesToRatio,
} from './utils'

describe('dbToGain', () => {
  it('matches known values', () => {
    expect(dbToGain(0)).toBe(1)
    expect(dbToGain(-6)).toBeCloseTo(0.5011872336, 10)
  })

  it('round trips with gainToDb', () => {
    const values = [0.125, 0.5, 1, 2, 4]

    for (const value of values) {
      expect(dbToGain(gainToDb(value))).toBeCloseTo(value, 10)
    }
  })
})

describe('time and pitch helpers', () => {
  it('converts milliseconds to samples', () => {
    expect(msToSamples(1000, 48_000)).toBe(48_000)
    expect(msToSamples(250, 48_000)).toBe(12_000)
  })

  it('converts samples to milliseconds', () => {
    expect(samplesToMs(48_000, 48_000)).toBe(1000)
    expect(samplesToMs(12_000, 48_000)).toBe(250)
  })

  it('converts semitones to playback ratios', () => {
    expect(semitonesToRatio(0)).toBe(1)
    expect(semitonesToRatio(12)).toBe(2)
    expect(semitonesToRatio(-12)).toBe(0.5)
  })
})

describe('clamp', () => {
  it('keeps values inside the bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-2, 0, 10)).toBe(0)
    expect(clamp(14, 0, 10)).toBe(10)
  })
})
