import type { GainOptions } from '../types'
import { dbToGain } from '../utils'
import { cloneBuffer } from './helpers'

export const applyGain = (
  buffer: AudioBuffer,
  { db }: GainOptions
): AudioBuffer => {
  const copy = cloneBuffer(buffer)
  const gain = dbToGain(db)

  for (
    let channelIndex = 0;
    channelIndex < copy.numberOfChannels;
    channelIndex += 1
  ) {
    const channel = copy.getChannelData(channelIndex)

    for (let sampleIndex = 0; sampleIndex < channel.length; sampleIndex += 1) {
      channel[sampleIndex] *= gain
    }
  }

  return copy
}
