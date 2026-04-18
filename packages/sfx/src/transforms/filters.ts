import type { FilterOptions } from '../types'
import { renderBufferThroughGraph } from './helpers'

const assertValidCutoff = (cutoff: number, sampleRate: number): void => {
  if (cutoff <= 0 || cutoff >= sampleRate / 2) {
    throw new Error('Cutoff must be below Nyquist and above zero')
  }
}

const applyBiquadFilter = async (
  buffer: AudioBuffer,
  type: BiquadFilterType,
  { cutoff, q = 1 }: FilterOptions
): Promise<AudioBuffer> => {
  assertValidCutoff(cutoff, buffer.sampleRate)

  return renderBufferThroughGraph(buffer, {
    buildGraph: (context, source) => {
      const filter = context.createBiquadFilter()

      filter.type = type
      filter.frequency.value = cutoff
      filter.Q.value = q

      source.connect(filter)
      filter.connect(context.destination)
    },
  })
}

export const applyLowpass = (
  buffer: AudioBuffer,
  options: FilterOptions
): Promise<AudioBuffer> => applyBiquadFilter(buffer, 'lowpass', options)

export const applyHighpass = (
  buffer: AudioBuffer,
  options: FilterOptions
): Promise<AudioBuffer> => applyBiquadFilter(buffer, 'highpass', options)

export const applyBandpass = (
  buffer: AudioBuffer,
  options: FilterOptions
): Promise<AudioBuffer> => applyBiquadFilter(buffer, 'bandpass', options)
