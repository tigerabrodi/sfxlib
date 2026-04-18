import type { DelayOptions } from '../types'
import { clamp } from '../utils'
import { renderBufferThroughGraph } from './helpers'

export const estimateDelayDurationSeconds = (
  baseDuration: number,
  { timeMs, feedback, wet = 0.5 }: DelayOptions
): number => {
  if (wet <= 0 || timeMs <= 0) {
    return baseDuration
  }

  let repeats = 1
  let amplitude = clamp(feedback, 0, 0.999)

  while (amplitude > 0.01 && repeats < 32) {
    repeats += 1
    amplitude *= clamp(feedback, 0, 0.999)
  }

  return baseDuration + (timeMs / 1000) * repeats
}

export const applyDelay = async (
  buffer: AudioBuffer,
  options: DelayOptions
): Promise<AudioBuffer> => {
  const wet = clamp(options.wet ?? 0.5, 0, 1)
  const feedback = clamp(options.feedback, 0, 0.999)
  const delayTime = Math.max(0, options.timeMs / 1000)
  const repeats = Math.max(
    0,
    Math.round(
      (estimateDelayDurationSeconds(buffer.duration, options) -
        buffer.duration) /
        Math.max(delayTime, 1 / buffer.sampleRate)
    )
  )
  const length = Math.max(
    1,
    Math.round(
      estimateDelayDurationSeconds(buffer.duration, options) * buffer.sampleRate
    )
  )

  return renderBufferThroughGraph(buffer, {
    length,
    buildGraph: (context, source) => {
      const output = context.createGain()
      const dryGain = context.createGain()

      dryGain.gain.value = 1 - wet

      source.connect(dryGain)
      dryGain.connect(output)

      let tapSource: AudioNode = source

      for (let repeatIndex = 0; repeatIndex < repeats; repeatIndex += 1) {
        const delay = context.createDelay()
        const tapGain = context.createGain()
        const feedbackGain = context.createGain()

        delay.delayTime.value = delayTime
        tapGain.gain.value = wet
        feedbackGain.gain.value = feedback

        tapSource.connect(delay)
        delay.connect(tapGain)
        tapGain.connect(output)
        delay.connect(feedbackGain)

        tapSource = feedbackGain
      }

      output.connect(context.destination)
    },
  })
}
