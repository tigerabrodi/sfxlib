import { describe, expect, it } from 'vitest'

import { Sfx } from './Sfx'

const rmsDifference = (first: Float32Array, second: Float32Array): number => {
  let total = 0

  for (let index = 0; index < first.length; index += 1) {
    const difference = first[index] - second[index]

    total += difference * difference
  }

  return Math.sqrt(total / first.length)
}

describe('distortion', () => {
  it('changes the waveform while keeping it bounded', async () => {
    const dry = Sfx.sine({
      freq: 440,
      durationMs: 120,
      sampleRate: 48_000,
    })
    const distorted = dry.distortion({
      amount: 0.8,
    })
    const drySamples = (await dry.getBuffer()).getChannelData(0)
    const distortedSamples = (await distorted.getBuffer()).getChannelData(0)
    const difference = rmsDifference(drySamples, distortedSamples)
    const peak = Math.max(
      ...Array.from(distortedSamples, (sample) => Math.abs(sample))
    )

    expect(difference).toBeGreaterThan(0.05)
    expect(peak).toBeLessThanOrEqual(1)
  })
})
