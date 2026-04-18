import { describe, expect, it } from 'vitest'

import { Sfx } from './Sfx'
import { concat, mix } from './factories/composition'

const channelData = async (sfx: Sfx): Promise<Array<number>> => {
  const buffer = await sfx.getBuffer()

  return Array.from(buffer.getChannelData(0))
}

describe('static composition factories', () => {
  it('Sfx.concat with an array matches chained instance concat', async () => {
    const first = Sfx.fromChannels({
      channels: [new Float32Array([1, 0])],
      sampleRate: 8_000,
    })
    const second = Sfx.fromChannels({
      channels: [new Float32Array([0.5, 0.5])],
      sampleRate: 8_000,
    })
    const third = Sfx.fromChannels({
      channels: [new Float32Array([-1, 0.25])],
      sampleRate: 8_000,
    })
    const staticConcat = Sfx.concat({
      others: [first, second, third],
    })
    const factoryConcat = concat({
      others: [first, second, third],
    })
    const chained = first.concat({ other: second }).concat({ other: third })

    expect(staticConcat.duration).toBeCloseTo(chained.duration, 6)
    expect(await channelData(staticConcat)).toEqual(await channelData(chained))
    expect(await channelData(factoryConcat)).toEqual(await channelData(chained))
  })

  it('Sfx.mix keeps the longest duration', () => {
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
    const staticMix = Sfx.mix({
      others: [long, short],
    })
    const factoryMix = mix({
      others: [long, short],
    })

    expect(staticMix.duration).toBeCloseTo(0.1, 6)
    expect(factoryMix.duration).toBeCloseTo(0.1, 6)
  })

  it('throws for mismatched formats in static concat', () => {
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

    expect(() =>
      Sfx.concat({
        others: [first, second],
      })
    ).toThrow(/sample rate and channel count must match/i)
  })

  it('throws for mismatched formats in static mix', () => {
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

    expect(() =>
      Sfx.mix({
        others: [first, second],
      })
    ).toThrow(/sample rate and channel count must match/i)
  })
})
