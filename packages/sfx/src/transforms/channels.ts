import { createBufferLike } from './helpers'

export const toMonoBuffer = (buffer: AudioBuffer): AudioBuffer => {
  const mono = createBufferLike(buffer, { channels: 1 })
  const target = mono.getChannelData(0)

  for (
    let channelIndex = 0;
    channelIndex < buffer.numberOfChannels;
    channelIndex += 1
  ) {
    const source = buffer.getChannelData(channelIndex)

    for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex += 1) {
      target[sampleIndex] += source[sampleIndex] / buffer.numberOfChannels
    }
  }

  return mono
}

export const toStereoBuffer = (buffer: AudioBuffer): AudioBuffer => {
  if (buffer.numberOfChannels === 2) {
    const stereo = createBufferLike(buffer)

    stereo.getChannelData(0).set(buffer.getChannelData(0))
    stereo.getChannelData(1).set(buffer.getChannelData(1))

    return stereo
  }

  const monoSource =
    buffer.numberOfChannels === 1 ? buffer : toMonoBuffer(buffer)
  const stereo = createBufferLike(monoSource, { channels: 2 })
  const monoChannel = monoSource.getChannelData(0)

  stereo.getChannelData(0).set(monoChannel)
  stereo.getChannelData(1).set(monoChannel)

  return stereo
}
