export const createBufferLike = (
  buffer: AudioBuffer,
  {
    channels = buffer.numberOfChannels,
    length = buffer.length,
    sampleRate = buffer.sampleRate,
  }: {
    channels?: number
    length?: number
    sampleRate?: number
  } = {}
): AudioBuffer =>
  new AudioBuffer({
    length,
    numberOfChannels: channels,
    sampleRate,
  })

export const cloneBuffer = (buffer: AudioBuffer): AudioBuffer => {
  const copy = createBufferLike(buffer)

  for (
    let channelIndex = 0;
    channelIndex < buffer.numberOfChannels;
    channelIndex += 1
  ) {
    copy.getChannelData(channelIndex).set(buffer.getChannelData(channelIndex))
  }

  return copy
}

export const assertMatchingBufferFormat = (
  first: AudioBuffer,
  second: AudioBuffer
): void => {
  if (
    first.sampleRate !== second.sampleRate ||
    first.numberOfChannels !== second.numberOfChannels
  ) {
    throw new Error('Sample rate and channel count must match')
  }
}
