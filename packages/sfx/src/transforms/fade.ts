import type { FadeOptions } from '../types'
import { clamp, msToSamples } from '../utils'
import { cloneBuffer } from './helpers'

export const applyFadeIn = (
  buffer: AudioBuffer,
  { ms }: FadeOptions
): AudioBuffer => {
  const copy = cloneBuffer(buffer)
  const fadeSamples = clamp(msToSamples(ms, copy.sampleRate), 0, copy.length)

  if (fadeSamples === 0) {
    return copy
  }

  for (
    let channelIndex = 0;
    channelIndex < copy.numberOfChannels;
    channelIndex += 1
  ) {
    const channel = copy.getChannelData(channelIndex)

    for (let sampleIndex = 0; sampleIndex < fadeSamples; sampleIndex += 1) {
      channel[sampleIndex] *= sampleIndex / Math.max(1, fadeSamples - 1)
    }
  }

  return copy
}

export const applyFadeOut = (
  buffer: AudioBuffer,
  { ms }: FadeOptions
): AudioBuffer => {
  const copy = cloneBuffer(buffer)
  const fadeSamples = clamp(msToSamples(ms, copy.sampleRate), 0, copy.length)

  if (fadeSamples === 0) {
    return copy
  }

  const startIndex = copy.length - fadeSamples

  for (
    let channelIndex = 0;
    channelIndex < copy.numberOfChannels;
    channelIndex += 1
  ) {
    const channel = copy.getChannelData(channelIndex)

    for (
      let sampleIndex = startIndex;
      sampleIndex < copy.length;
      sampleIndex += 1
    ) {
      const fadeIndex = sampleIndex - startIndex
      const multiplier = 1 - fadeIndex / Math.max(1, fadeSamples - 1)

      channel[sampleIndex] *= multiplier
    }
  }

  return copy
}
