import { describe, expect, it } from 'vitest'

import { Sfx } from './Sfx'

const rms = (samples: Float32Array): number => {
  let total = 0

  for (const sample of samples) {
    total += sample * sample
  }

  return Math.sqrt(total / samples.length)
}

describe('filters', () => {
  it('lowpass reduces high frequency energy', async () => {
    const dry = Sfx.sine({
      freq: 10_000,
      durationMs: 120,
      sampleRate: 48_000,
    })
    const filtered = dry.lowpass({
      cutoff: 1_000,
    })
    const dryRms = rms((await dry.getBuffer()).getChannelData(0))
    const filteredRms = rms((await filtered.getBuffer()).getChannelData(0))

    expect(filteredRms).toBeLessThan(dryRms * 0.35)
  })

  it('highpass reduces low frequency energy', async () => {
    const dry = Sfx.sine({
      freq: 200,
      durationMs: 120,
      sampleRate: 48_000,
    })
    const filtered = dry.highpass({
      cutoff: 4_000,
    })
    const dryRms = rms((await dry.getBuffer()).getChannelData(0))
    const filteredRms = rms((await filtered.getBuffer()).getChannelData(0))

    expect(filteredRms).toBeLessThan(dryRms * 0.25)
  })

  it('bandpass keeps energy near the target band', async () => {
    const filtered = Sfx.sine({
      freq: 1_000,
      durationMs: 120,
      sampleRate: 48_000,
    }).bandpass({
      cutoff: 1_000,
      q: 8,
    })
    const filteredRms = rms((await filtered.getBuffer()).getChannelData(0))

    expect(filteredRms).toBeGreaterThan(0.15)
  })
})
