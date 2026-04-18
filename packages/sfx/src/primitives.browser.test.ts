import { describe, expect, it } from 'vitest'

import { Sfx } from './Sfx'
import { noise, saw, sine, square, triangle } from './factories/primitives'

const readRange = (samples: Float32Array): { min: number; max: number } => {
  let min = Infinity
  let max = -Infinity

  for (const sample of samples) {
    if (sample < min) {
      min = sample
    }

    if (sample > max) {
      max = sample
    }
  }

  return { min, max }
}

const countPositiveZeroCrossings = (samples: Float32Array): number => {
  let crossings = 0

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]
    const current = samples[index]

    if (previous <= 0 && current > 0) {
      crossings += 1
    }
  }

  return crossings
}

const toByteArray = (samples: Float32Array): Array<number> =>
  Array.from(new Uint8Array(samples.slice().buffer))

const primitiveOscillators = [
  { name: 'sine', create: sine },
  { name: 'square', create: square },
  { name: 'saw', create: saw },
  { name: 'triangle', create: triangle },
] as const

const noiseTypes = ['white', 'pink', 'brown'] as const

describe('primitive oscillators', () => {
  for (const primitive of primitiveOscillators) {
    it(`${primitive.name} renders the requested duration and stays in bounds`, async () => {
      const sfx = primitive.create({
        freq: 440,
        durationMs: 100,
        sampleRate: 24_000,
      })
      const buffer = await sfx.getBuffer()
      const samples = buffer.getChannelData(0)
      const { min, max } = readRange(samples)

      expect(sfx.duration).toBeCloseTo(0.1, 6)
      expect(sfx.sampleRate).toBe(24_000)
      expect(sfx.channels).toBe(1)
      expect(buffer.length).toBe(2_400)
      expect(min).toBeGreaterThanOrEqual(-1)
      expect(max).toBeLessThanOrEqual(1)
    })
  }

  it('sine crosses zero close to the expected number of times', async () => {
    const sfx = Sfx.sine({
      freq: 440,
      durationMs: 100,
      sampleRate: 48_000,
    })
    const buffer = await sfx.getBuffer()
    const crossings = countPositiveZeroCrossings(buffer.getChannelData(0))

    expect(crossings).toBeGreaterThanOrEqual(43)
    expect(crossings).toBeLessThanOrEqual(45)
  })
})

describe('noise primitives', () => {
  for (const type of noiseTypes) {
    it(`${type} noise renders the requested duration and stays in bounds`, async () => {
      const sfx = noise({
        durationMs: 80,
        sampleRate: 24_000,
        seed: 7,
        type,
      })
      const buffer = await sfx.getBuffer()
      const samples = buffer.getChannelData(0)
      const { min, max } = readRange(samples)

      expect(sfx.duration).toBeCloseTo(0.08, 6)
      expect(sfx.sampleRate).toBe(24_000)
      expect(sfx.channels).toBe(1)
      expect(buffer.length).toBe(1_920)
      expect(min).toBeGreaterThanOrEqual(-1)
      expect(max).toBeLessThanOrEqual(1)
    })
  }

  it('returns byte identical noise for the same seed', async () => {
    const first = noise({
      durationMs: 80,
      sampleRate: 24_000,
      seed: 42,
      type: 'pink',
    })
    const second = noise({
      durationMs: 80,
      sampleRate: 24_000,
      seed: 42,
      type: 'pink',
    })
    const firstBuffer = await first.getBuffer()
    const secondBuffer = await second.getBuffer()

    expect(toByteArray(firstBuffer.getChannelData(0))).toEqual(
      toByteArray(secondBuffer.getChannelData(0))
    )
  })

  it('returns different noise when no seed is given', async () => {
    const first = noise({
      durationMs: 80,
      sampleRate: 24_000,
      type: 'white',
    })
    const second = noise({
      durationMs: 80,
      sampleRate: 24_000,
      type: 'white',
    })
    const firstSamples = (await first.getBuffer()).getChannelData(0)
    const secondSamples = (await second.getBuffer()).getChannelData(0)
    let difference = 0

    for (let index = 0; index < firstSamples.length; index += 1) {
      difference += Math.abs(firstSamples[index] - secondSamples[index])
    }

    expect(difference).toBeGreaterThan(0.1)
  })
})
