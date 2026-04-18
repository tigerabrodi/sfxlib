import { describe, expect, it } from 'vitest'

import { Sfx } from './Sfx'

const countPositiveZeroCrossings = (samples: Float32Array): number => {
  let crossings = 0

  for (let index = 1; index < samples.length; index += 1) {
    if (samples[index - 1] <= 0 && samples[index] > 0) {
      crossings += 1
    }
  }

  return crossings
}

describe('pitch', () => {
  it('raising by twelve semitones halves duration and doubles frequency content', async () => {
    const pitched = Sfx.sine({
      freq: 440,
      durationMs: 100,
      sampleRate: 48_000,
    }).pitch({
      semitones: 12,
    })
    const buffer = await pitched.getBuffer()
    const crossings = countPositiveZeroCrossings(buffer.getChannelData(0))

    expect(pitched.duration).toBeCloseTo(0.05, 3)
    expect(buffer.length).toBe(2_400)
    expect(crossings).toBeGreaterThanOrEqual(43)
    expect(crossings).toBeLessThanOrEqual(45)
  })
})
