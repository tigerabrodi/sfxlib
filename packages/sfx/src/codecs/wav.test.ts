import { describe, expect, it } from 'vitest'

import { encodeWav } from './wav'

const readAscii = (bytes: Uint8Array, start: number, length: number): string =>
  String.fromCharCode(...bytes.slice(start, start + length))

const readUint16 = (bytes: Uint8Array, start: number): number =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(
    start,
    true
  )

const readUint32 = (bytes: Uint8Array, start: number): number =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    start,
    true
  )

describe('encodeWav', () => {
  it('encodes one second of mono silence', () => {
    const wav = encodeWav({
      channels: [new Float32Array(48_000)],
      sampleRate: 48_000,
    })

    expect(readAscii(wav, 0, 4)).toBe('RIFF')
    expect(readAscii(wav, 8, 4)).toBe('WAVE')
    expect(readAscii(wav, 12, 4)).toBe('fmt ')
    expect(readAscii(wav, 36, 4)).toBe('data')
    expect(readUint16(wav, 22)).toBe(1)
    expect(readUint32(wav, 24)).toBe(48_000)
    expect(readUint16(wav, 34)).toBe(16)
    expect(readUint32(wav, 40)).toBe(96_000)
    expect(wav.byteLength).toBe(96_044)
  })

  it('encodes one second of stereo silence', () => {
    const wav = encodeWav({
      channels: [new Float32Array(44_100), new Float32Array(44_100)],
      sampleRate: 44_100,
    })

    expect(readUint16(wav, 22)).toBe(2)
    expect(readUint32(wav, 24)).toBe(44_100)
    expect(readUint32(wav, 28)).toBe(176_400)
    expect(readUint16(wav, 32)).toBe(4)
    expect(readUint32(wav, 40)).toBe(176_400)
    expect(wav.byteLength).toBe(176_444)
  })
})
