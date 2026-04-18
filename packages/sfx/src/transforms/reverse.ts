import { cloneBuffer } from './helpers'

export const reverseBuffer = (buffer: AudioBuffer): AudioBuffer => {
  const copy = cloneBuffer(buffer)

  for (
    let channelIndex = 0;
    channelIndex < copy.numberOfChannels;
    channelIndex += 1
  ) {
    copy.getChannelData(channelIndex).reverse()
  }

  return copy
}
