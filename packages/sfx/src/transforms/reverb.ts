import { createRng } from '../rng'
import type { ReverbOptions } from '../types'
import { clamp } from '../utils'
import { renderBufferThroughGraph } from './helpers'

const IMPULSE_SEED = 1_337

export const estimateReverbDurationSeconds = (
  baseDuration: number,
  { durationMs = 1_000, wet = 0.5 }: ReverbOptions
): number => {
  if (wet <= 0) {
    return baseDuration
  }

  return baseDuration + durationMs / 1000
}

const createImpulseResponse = (
  context: OfflineAudioContext,
  { durationMs = 1_000, decay = 0.5 }: ReverbOptions
): AudioBuffer => {
  const length = Math.max(
    1,
    Math.round((durationMs / 1000) * context.sampleRate)
  )
  const impulse = context.createBuffer(
    context.destination.channelCount,
    length,
    context.sampleRate
  )
  const rng = createRng(IMPULSE_SEED)
  const decayFactor = clamp(decay, 0, 1) * 8 + 1

  for (
    let channelIndex = 0;
    channelIndex < impulse.numberOfChannels;
    channelIndex += 1
  ) {
    const channel = impulse.getChannelData(channelIndex)

    for (let sampleIndex = 0; sampleIndex < channel.length; sampleIndex += 1) {
      const progress = 1 - sampleIndex / channel.length
      const amplitude = progress ** decayFactor

      channel[sampleIndex] = (rng() * 2 - 1) * amplitude
    }
  }

  return impulse
}

export const applyReverb = async (
  buffer: AudioBuffer,
  options: ReverbOptions
): Promise<AudioBuffer> => {
  const wet = clamp(options.wet ?? 0.5, 0, 1)
  const length = Math.max(
    1,
    Math.round(
      estimateReverbDurationSeconds(buffer.duration, options) *
        buffer.sampleRate
    )
  )

  return renderBufferThroughGraph(buffer, {
    length,
    buildGraph: (context, source) => {
      const output = context.createGain()
      const dryGain = context.createGain()
      const wetGain = context.createGain()
      const convolver = context.createConvolver()

      dryGain.gain.value = 1 - wet
      wetGain.gain.value = wet
      convolver.buffer = createImpulseResponse(context, options)

      source.connect(dryGain)
      dryGain.connect(output)

      source.connect(convolver)
      convolver.connect(wetGain)
      wetGain.connect(output)

      output.connect(context.destination)
    },
  })
}
