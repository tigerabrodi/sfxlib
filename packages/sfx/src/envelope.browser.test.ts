import { describe, expect, it } from 'vitest'

import { Sfx } from './Sfx'

describe('envelope', () => {
  it('starts at zero. reaches peak. settles to sustain. and ends at zero', async () => {
    const sfx = Sfx.fromChannels({
      channels: [new Float32Array(800).fill(1)],
      sampleRate: 8_000,
    }).envelope({
      attackMs: 10,
      decayMs: 20,
      sustain: 0.4,
      releaseMs: 30,
    })
    const samples = (await sfx.getBuffer()).getChannelData(0)

    expect(samples[0]).toBeCloseTo(0, 6)
    expect(samples[79]).toBeGreaterThan(0.95)
    expect(samples[399]).toBeGreaterThan(0.35)
    expect(samples[399]).toBeLessThan(0.45)
    expect(Math.abs(samples[799])).toBeLessThan(0.01)
  })
})
