import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { configure, createOfflineContext, getSharedContext } from './context'

describe('context helpers', () => {
  let originalContext: AudioContext
  let contextsToClose: Array<AudioContext>

  beforeEach(() => {
    originalContext = getSharedContext()
    contextsToClose = []
  })

  afterEach(async () => {
    configure({
      context: originalContext,
      defaultSampleRate: originalContext.sampleRate,
    })

    await Promise.all(
      contextsToClose
        .filter((context) => context.state !== 'closed')
        .map((context) => context.close())
    )
  })

  it('returns the same shared context instance across calls', () => {
    const first = getSharedContext()
    const second = getSharedContext()

    expect(second).toBe(first)
  })

  it('configure swaps the shared context', () => {
    const replacement = new AudioContext()

    contextsToClose.push(replacement)
    configure({ context: replacement })

    expect(getSharedContext()).toBe(replacement)
  })

  it('createOfflineContext honors duration sample rate and channel count', async () => {
    const offlineContext = createOfflineContext({
      durationMs: 250,
      sampleRate: 24_000,
      channels: 2,
    })
    const rendered = await offlineContext.startRendering()

    expect(offlineContext.sampleRate).toBe(24_000)
    expect(offlineContext.length).toBe(6_000)
    expect(rendered.numberOfChannels).toBe(2)
  })

  it('uses the configured default sample rate when none is passed', () => {
    configure({ defaultSampleRate: 22_050 })

    const offlineContext = createOfflineContext({
      durationMs: 100,
      channels: 1,
    })

    expect(offlineContext.sampleRate).toBe(22_050)
    expect(offlineContext.length).toBe(2_205)
  })
})
