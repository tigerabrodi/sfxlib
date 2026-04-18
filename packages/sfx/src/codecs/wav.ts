import type { WavData } from '../types'
import { clamp } from '../utils'

const PCM_FORMAT = 1
const BITS_PER_SAMPLE = 16
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8
const WAV_HEADER_BYTES = 44

const writeAscii = (bytes: Uint8Array, offset: number, value: string): void => {
  for (let index = 0; index < value.length; index += 1) {
    bytes[offset + index] = value.charCodeAt(index)
  }
}

const encodeSample = (sample: number): number => {
  const normalized = clamp(sample, -1, 1)

  if (normalized < 0) {
    return Math.round(normalized * 0x8000)
  }

  return Math.round(normalized * 0x7fff)
}

export const encodeWav = ({ channels, sampleRate }: WavData): Uint8Array => {
  const channelCount = channels.length
  const frameCount = channels[0]?.length ?? 0
  const blockAlign = channelCount * BYTES_PER_SAMPLE
  const byteRate = sampleRate * blockAlign
  const dataSize = frameCount * blockAlign
  const bytes = new Uint8Array(WAV_HEADER_BYTES + dataSize)
  const view = new DataView(bytes.buffer)

  writeAscii(bytes, 0, 'RIFF')
  view.setUint32(4, bytes.byteLength - 8, true)
  writeAscii(bytes, 8, 'WAVE')
  writeAscii(bytes, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, PCM_FORMAT, true)
  view.setUint16(22, channelCount, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, BITS_PER_SAMPLE, true)
  writeAscii(bytes, 36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = WAV_HEADER_BYTES

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    for (const channel of channels) {
      view.setInt16(offset, encodeSample(channel[frameIndex] ?? 0), true)
      offset += BYTES_PER_SAMPLE
    }
  }

  return bytes
}
