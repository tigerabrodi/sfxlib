import type { DistortionOptions } from '../types'
import { clamp } from '../utils'
import { renderBufferThroughGraph } from './helpers'

const createDistortionCurve = (amount: number): Float32Array<ArrayBuffer> => {
  const curve: Float32Array<ArrayBuffer> = new Float32Array(
    new ArrayBuffer(4_096 * Float32Array.BYTES_PER_ELEMENT)
  )
  const intensity = clamp(amount, 0, 1) * 400

  for (let index = 0; index < curve.length; index += 1) {
    const x = (index * 2) / (curve.length - 1) - 1

    curve[index] =
      ((3 + intensity) * x * 20 * (Math.PI / 180)) /
      (Math.PI + intensity * Math.abs(x))
  }

  return curve
}

export const applyDistortion = async (
  buffer: AudioBuffer,
  { amount }: DistortionOptions
): Promise<AudioBuffer> =>
  renderBufferThroughGraph(buffer, {
    buildGraph: (context, source) => {
      const shaper = context.createWaveShaper()

      shaper.curve = createDistortionCurve(amount)
      shaper.oversample = '4x'

      source.connect(shaper)
      shaper.connect(context.destination)
    },
  })
