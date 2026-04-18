import type { SliceOptions } from '../types'
import { clamp, msToSamples } from '../utils'
import { createBufferLike } from './helpers'

export const sliceBuffer = (
  buffer: AudioBuffer,
  { startMs, endMs }: SliceOptions
): AudioBuffer => {
  const startSample = clamp(
    msToSamples(startMs, buffer.sampleRate),
    0,
    buffer.length
  )
  const endSample = clamp(
    msToSamples(endMs, buffer.sampleRate),
    startSample,
    buffer.length
  )
  const length = Math.max(1, endSample - startSample)
  const sliced = createBufferLike(buffer, { length })

  for (
    let channelIndex = 0;
    channelIndex < buffer.numberOfChannels;
    channelIndex += 1
  ) {
    const source = buffer.getChannelData(channelIndex)
    const target = sliced.getChannelData(channelIndex)

    target.set(source.slice(startSample, startSample + length))
  }

  return sliced
}
