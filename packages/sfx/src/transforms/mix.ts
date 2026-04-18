import { assertMatchingBufferFormat, createBufferLike } from './helpers'

export const mixBuffers = (
  first: AudioBuffer,
  second: AudioBuffer
): AudioBuffer => {
  assertMatchingBufferFormat(first, second)

  const mixed = createBufferLike(first, {
    length: Math.max(first.length, second.length),
  })

  for (
    let channelIndex = 0;
    channelIndex < first.numberOfChannels;
    channelIndex += 1
  ) {
    const target = mixed.getChannelData(channelIndex)
    const firstChannel = first.getChannelData(channelIndex)
    const secondChannel = second.getChannelData(channelIndex)

    for (let sampleIndex = 0; sampleIndex < target.length; sampleIndex += 1) {
      target[sampleIndex] =
        (firstChannel[sampleIndex] ?? 0) + (secondChannel[sampleIndex] ?? 0)
    }
  }

  return mixed
}
