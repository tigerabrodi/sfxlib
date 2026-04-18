import { describe, expect, it } from 'vitest'

import { Sfx } from './Sfx'

const rms = (samples: Float32Array, start: number, end: number): number => {
  let total = 0

  for (let index = start; index < end; index += 1) {
    total += samples[index] * samples[index]
  }

  return Math.sqrt(total / Math.max(1, end - start))
}

describe('reverb', () => {
  it('extends the signal and leaves a quieter tail than the head', async () => {
    const impulse = new Float32Array(800)

    impulse[0] = 1

    const dry = Sfx.fromChannels({
      channels: [impulse],
      sampleRate: 8_000,
    })
    const wet = dry.reverb({
      durationMs: 200,
      decay: 0.6,
      wet: 1,
    })
    const samples = (await wet.getBuffer()).getChannelData(0)

    expect(wet.duration).toBeGreaterThan(dry.duration)
    expect(samples.length).toBeGreaterThan(impulse.length)
    expect(rms(samples, 0, 160)).toBeGreaterThan(rms(samples, 800, 960))
  })
})
