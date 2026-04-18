import type { ResampleOptions } from '../types'

export const resampleBuffer = async (
  buffer: AudioBuffer,
  { sampleRate }: ResampleOptions
): Promise<AudioBuffer> => {
  const length = Math.max(1, Math.round(buffer.duration * sampleRate))
  const offlineContext = new OfflineAudioContext(
    buffer.numberOfChannels,
    length,
    sampleRate
  )
  const source = offlineContext.createBufferSource()

  source.buffer = buffer
  source.connect(offlineContext.destination)
  source.start(0)

  return offlineContext.startRendering()
}
