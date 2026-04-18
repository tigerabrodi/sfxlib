import type { SpeedOptions } from '../types'

export const changeSpeed = async (
  buffer: AudioBuffer,
  { rate }: SpeedOptions
): Promise<AudioBuffer> => {
  const length = Math.max(1, Math.round(buffer.length / rate))
  const offlineContext = new OfflineAudioContext(
    buffer.numberOfChannels,
    length,
    buffer.sampleRate
  )
  const source = offlineContext.createBufferSource()

  source.buffer = buffer
  source.playbackRate.value = rate
  source.connect(offlineContext.destination)
  source.start(0)

  return offlineContext.startRendering()
}
