import { describe, expect, it } from 'vitest'

import { Sfx } from './Sfx'

const rms = (samples: Float32Array): number => {
  let total = 0

  for (const sample of samples) {
    total += sample * sample
  }

  return Math.sqrt(total / samples.length)
}

const samplesToArray = async (
  sfx: Sfx,
  channel = 0
): Promise<Array<number>> => {
  const buffer = await sfx.getBuffer()

  return Array.from(buffer.getChannelData(channel))
}

describe('shared transforms', () => {
  it('gain with minus six db roughly halves rms', async () => {
    const original = Sfx.sine({
      freq: 440,
      durationMs: 100,
      sampleRate: 48_000,
    })
    const quieter = original.gain({ db: -6 })
    const originalSamples = (await original.getBuffer()).getChannelData(0)
    const quieterSamples = (await quieter.getBuffer()).getChannelData(0)
    const ratio = rms(quieterSamples) / rms(originalSamples)

    expect(ratio).toBeGreaterThan(0.49)
    expect(ratio).toBeLessThan(0.52)
  })

  it('fadeIn starts near zero and reaches full level by the target time', async () => {
    const sfx = Sfx.fromChannels({
      channels: [new Float32Array(800).fill(1)],
      sampleRate: 8_000,
    }).fadeIn({ ms: 20 })
    const samples = (await sfx.getBuffer()).getChannelData(0)

    expect(samples[0]).toBeCloseTo(0, 6)
    expect(samples[159]).toBeGreaterThan(0.9)
    expect(samples[799]).toBeCloseTo(1, 6)
  })

  it('reverse called twice returns the original samples', async () => {
    const original = Sfx.fromChannels({
      channels: [new Float32Array([0.1, -0.25, 0.5, -0.75])],
      sampleRate: 8_000,
    })
    const reversedTwice = original.reverse().reverse()

    expect(await samplesToArray(reversedTwice)).toEqual(
      await samplesToArray(original)
    )
  })

  it('slice returns the requested duration', async () => {
    const sliced = Sfx.sine({
      freq: 330,
      durationMs: 100,
      sampleRate: 48_000,
    }).slice({
      startMs: 25,
      endMs: 75,
    })
    const buffer = await sliced.getBuffer()

    expect(sliced.duration).toBeCloseTo(0.05, 6)
    expect(buffer.length).toBe(2_400)
  })

  it('concat sums durations', async () => {
    const first = Sfx.silence({
      durationMs: 100,
      sampleRate: 48_000,
      channels: 1,
    })
    const second = Sfx.silence({
      durationMs: 50,
      sampleRate: 48_000,
      channels: 1,
    })
    const combined = first.concat({ other: second })
    const buffer = await combined.getBuffer()

    expect(combined.duration).toBeCloseTo(0.15, 6)
    expect(buffer.length).toBe(7_200)
  })

  it('mix keeps the longest duration', async () => {
    const long = Sfx.silence({
      durationMs: 100,
      sampleRate: 48_000,
      channels: 1,
    })
    const short = Sfx.silence({
      durationMs: 50,
      sampleRate: 48_000,
      channels: 1,
    })
    const mixed = long.mix({ other: short })
    const buffer = await mixed.getBuffer()

    expect(mixed.duration).toBeCloseTo(0.1, 6)
    expect(buffer.length).toBe(4_800)
  })

  it('resample changes sample count to match the new sample rate', async () => {
    const sfx = Sfx.sine({
      freq: 440,
      durationMs: 100,
      sampleRate: 48_000,
    }).resample({
      sampleRate: 24_000,
    })
    const buffer = await sfx.getBuffer()

    expect(sfx.sampleRate).toBe(24_000)
    expect(sfx.duration).toBeCloseTo(0.1, 6)
    expect(buffer.length).toBe(2_400)
  })

  it('toMono averages channels and toStereo produces two channels', async () => {
    const stereo = Sfx.fromChannels({
      channels: [
        new Float32Array([1, 0.5, -0.5]),
        new Float32Array([-1, 0.5, 0.5]),
      ],
      sampleRate: 8_000,
    })
    const mono = stereo.toMono()
    const monoBuffer = await mono.getBuffer()
    const stereoAgain = mono.toStereo()
    const stereoBuffer = await stereoAgain.getBuffer()

    expect(mono.channels).toBe(1)
    expect(Array.from(monoBuffer.getChannelData(0))).toEqual([0, 0.5, 0])
    expect(stereoAgain.channels).toBe(2)
    expect(Array.from(stereoBuffer.getChannelData(0))).toEqual([0, 0.5, 0])
    expect(Array.from(stereoBuffer.getChannelData(1))).toEqual([0, 0.5, 0])
  })

  it('speed changes duration without preserving pitch', async () => {
    const faster = Sfx.sine({
      freq: 440,
      durationMs: 100,
      sampleRate: 48_000,
    }).speed({
      rate: 2,
    })
    const buffer = await faster.getBuffer()

    expect(faster.duration).toBeCloseTo(0.05, 3)
    expect(buffer.length).toBe(2_400)
  })

  it('throws for concat with mismatched sample rates', () => {
    const first = Sfx.silence({
      durationMs: 20,
      sampleRate: 48_000,
      channels: 1,
    })
    const second = Sfx.silence({
      durationMs: 20,
      sampleRate: 24_000,
      channels: 1,
    })

    expect(() => first.concat({ other: second })).toThrow(
      /sample rate and channel count must match/i
    )
  })

  it('throws for mix with mismatched channel counts', () => {
    const first = Sfx.silence({
      durationMs: 20,
      sampleRate: 48_000,
      channels: 1,
    })
    const second = Sfx.silence({
      durationMs: 20,
      sampleRate: 48_000,
      channels: 2,
    })

    expect(() => first.mix({ other: second })).toThrow(
      /sample rate and channel count must match/i
    )
  })
})
