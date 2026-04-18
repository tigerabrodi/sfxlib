import { describe, expect, it } from 'vitest'

import { Sfx } from './Sfx'
import { fromBuffer, fromChannels, silence } from './factories/loading'

describe('loading factories', () => {
  it('fromBuffer wraps the same underlying buffer without copying', async () => {
    const buffer = new AudioBuffer({
      length: 256,
      numberOfChannels: 2,
      sampleRate: 16_000,
    })
    const sfx = fromBuffer({ buffer })

    await expect(sfx.getBuffer()).resolves.toBe(buffer)
  })

  it('fromChannels copies input samples into the resulting buffer', async () => {
    const left = new Float32Array([0, 0.25, -0.5, 1])
    const right = new Float32Array([1, -1, 0.5, -0.25])
    const sfx = fromChannels({
      channels: [left, right],
      sampleRate: 8_000,
    })
    const buffer = await sfx.getBuffer()

    expect(sfx.sampleRate).toBe(8_000)
    expect(sfx.channels).toBe(2)
    expect(Array.from(buffer.getChannelData(0))).toEqual(Array.from(left))
    expect(Array.from(buffer.getChannelData(1))).toEqual(Array.from(right))
  })

  it('silence creates a zero filled buffer of the correct length', async () => {
    const sfx = silence({
      durationMs: 250,
      channels: 2,
      sampleRate: 24_000,
    })
    const buffer = await sfx.getBuffer()

    expect(sfx.duration).toBeCloseTo(0.25, 6)
    expect(sfx.sampleRate).toBe(24_000)
    expect(sfx.channels).toBe(2)
    expect(buffer.length).toBe(6_000)
    expect(Array.from(buffer.getChannelData(0))).toEqual(Array(6_000).fill(0))
    expect(Array.from(buffer.getChannelData(1))).toEqual(Array(6_000).fill(0))
  })

  it('static Sfx loading methods delegate to the same behavior', async () => {
    const fromChannelsSfx = Sfx.fromChannels({
      channels: [new Float32Array([0.5, -0.5])],
      sampleRate: 4_000,
    })
    const silenceSfx = Sfx.silence({
      durationMs: 50,
      channels: 1,
      sampleRate: 4_000,
    })

    await expect(fromChannelsSfx.getBuffer()).resolves.toBeInstanceOf(
      AudioBuffer
    )
    await expect(silenceSfx.getBuffer()).resolves.toBeInstanceOf(AudioBuffer)
    expect(silenceSfx.duration).toBeCloseTo(0.05, 6)
  })
})
