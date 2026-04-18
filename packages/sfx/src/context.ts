import type { ConfigureOptions, CreateOfflineContextOptions } from './types'
import { msToSamples } from './utils'

let sharedContext: AudioContext | undefined
let sharedDefaultSampleRate: number | undefined

const resolveSampleRate = (sampleRate?: number): number => {
  if (sampleRate !== undefined) {
    return sampleRate
  }

  if (sharedDefaultSampleRate !== undefined) {
    return sharedDefaultSampleRate
  }

  return getSharedContext().sampleRate
}

export const configure = ({
  context,
  defaultSampleRate,
}: ConfigureOptions = {}): void => {
  if (context !== undefined) {
    sharedContext = context
  }

  if (defaultSampleRate !== undefined) {
    sharedDefaultSampleRate = defaultSampleRate
  }
}

export const getSharedContext = (): AudioContext => {
  sharedContext ??= new AudioContext()

  return sharedContext
}

export const createOfflineContext = ({
  durationMs,
  sampleRate,
  channels = 1,
}: CreateOfflineContextOptions): OfflineAudioContext => {
  const resolvedSampleRate = resolveSampleRate(sampleRate)
  const length = Math.max(1, msToSamples(durationMs, resolvedSampleRate))

  return new OfflineAudioContext(channels, length, resolvedSampleRate)
}
