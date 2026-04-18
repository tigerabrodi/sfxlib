import type { EnvelopeOptions } from '../types'
import { clamp } from '../utils'
import { renderBufferThroughGraph } from './helpers'

export const applyEnvelope = async (
  buffer: AudioBuffer,
  { attackMs, decayMs, sustain, releaseMs }: EnvelopeOptions
): Promise<AudioBuffer> => {
  const duration = buffer.duration
  const attack = Math.max(0, attackMs / 1000)
  const decay = Math.max(0, decayMs / 1000)
  const release = Math.max(0, releaseMs / 1000)
  const sustainLevel = clamp(sustain, 0, 1)

  return renderBufferThroughGraph(buffer, {
    buildGraph: (context, source) => {
      const gain = context.createGain()
      const attackEnd = Math.min(duration, attack)
      const releaseStart = Math.max(attackEnd, duration - release)
      const decayEnd = Math.min(releaseStart, attackEnd + decay)

      gain.gain.setValueAtTime(0, 0)
      gain.gain.linearRampToValueAtTime(1, attackEnd)
      gain.gain.linearRampToValueAtTime(sustainLevel, decayEnd)
      gain.gain.setValueAtTime(sustainLevel, releaseStart)
      gain.gain.linearRampToValueAtTime(0, duration)

      source.connect(gain)
      gain.connect(context.destination)
    },
  })
}
