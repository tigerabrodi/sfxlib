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

export const renderBufferThroughGraph = async (
  buffer: AudioBuffer,
  {
    length = buffer.length,
    sampleRate = buffer.sampleRate,
    channels = buffer.numberOfChannels,
    buildGraph,
  }: {
    length?: number
    sampleRate?: number
    channels?: number
    buildGraph: (
      context: OfflineAudioContext,
      source: AudioBufferSourceNode
    ) => void
  }
): Promise<AudioBuffer> => {
  const context = new OfflineAudioContext(channels, length, sampleRate)
  const source = context.createBufferSource()

  source.buffer = buffer
  buildGraph(context, source)
  source.start(0)

  return context.startRendering()
}
