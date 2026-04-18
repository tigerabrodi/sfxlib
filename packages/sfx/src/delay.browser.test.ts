import { describe, expect, it } from 'vitest'

import { Sfx } from './Sfx'

const peakAround = (
  samples: Float32Array,
  center: number,
  radius: number
): number => {
  let peak = 0

  for (
    let index = Math.max(0, center - radius);
    index <= Math.min(samples.length - 1, center + radius);
    index += 1
  ) {
    peak = Math.max(peak, Math.abs(samples[index]))
  }

  return peak
}

describe('delay', () => {
  it('creates decaying taps at the expected delay offsets', async () => {
    const impulse = new Float32Array(3_200)

    impulse[0] = 1

    const delayed = Sfx.fromChannels({
      channels: [impulse],
      sampleRate: 8_000,
    }).delay({
      timeMs: 50,
      feedback: 0.5,
      wet: 1,
    })
    const samples = (await delayed.getBuffer()).getChannelData(0)

    expect(peakAround(samples, 400, 5)).toBeGreaterThan(0.9)
    expect(peakAround(samples, 800, 5)).toBeGreaterThan(0.45)
    expect(peakAround(samples, 800, 5)).toBeLessThan(0.55)
    expect(peakAround(samples, 1_200, 5)).toBeGreaterThan(0.2)
    expect(peakAround(samples, 1_200, 5)).toBeLessThan(0.3)
  })
})
