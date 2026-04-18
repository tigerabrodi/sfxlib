import { assertMatchingBufferFormat, createBufferLike } from './helpers'

export const concatBuffers = (
  first: AudioBuffer,
  second: AudioBuffer
): AudioBuffer => {
  assertMatchingBufferFormat(first, second)

  const concatenated = createBufferLike(first, {
    length: first.length + second.length,
  })

  for (
    let channelIndex = 0;
    channelIndex < first.numberOfChannels;
    channelIndex += 1
  ) {
    const target = concatenated.getChannelData(channelIndex)

    target.set(first.getChannelData(channelIndex), 0)
    target.set(second.getChannelData(channelIndex), first.length)
  }

  return concatenated
}
