import { describe, expect, it } from 'vitest'

import { Sfx } from './Sfx'
import { createOfflineContext } from './context'

describe('Sfx.fromBuffer', () => {
  it('wraps a rendered buffer and exposes sync metadata', async () => {
    const offlineContext = createOfflineContext({
      durationMs: 250,
      sampleRate: 24_000,
      channels: 2,
    })
    const source = offlineContext.createBufferSource()

    source.buffer = offlineContext.createBuffer(
      2,
      offlineContext.length,
      offlineContext.sampleRate
    )
    source.connect(offlineContext.destination)
    source.start()

    const rendered = await offlineContext.startRendering()
    const sfx = Sfx.fromBuffer({ buffer: rendered })

    expect(sfx.duration).toBeCloseTo(0.25, 6)
    expect(sfx.sampleRate).toBe(24_000)
    expect(sfx.channels).toBe(2)
    await expect(sfx.getBuffer()).resolves.toBe(rendered)
  })

  it('is immutable from the public surface', async () => {
    const buffer = new AudioBuffer({
      length: 128,
      numberOfChannels: 1,
      sampleRate: 8_000,
    })
    const sfx = Sfx.fromBuffer({ buffer })
    const durationDescriptor = Object.getOwnPropertyDescriptor(
      Sfx.prototype,
      'duration',
    )
    const sampleRateDescriptor = Object.getOwnPropertyDescriptor(
      Sfx.prototype,
      'sampleRate',
    )
    const channelsDescriptor = Object.getOwnPropertyDescriptor(
      Sfx.prototype,
      'channels',
    )

    expect(Object.isFrozen(sfx)).toBe(true)
    expect(durationDescriptor?.set === undefined).toBe(true)
    expect(sampleRateDescriptor?.set === undefined).toBe(true)
    expect(channelsDescriptor?.set === undefined).toBe(true)
    expect('buffer' in sfx).toBe(false)
    await expect(sfx.getBuffer()).resolves.toBe(buffer)
  })
})
