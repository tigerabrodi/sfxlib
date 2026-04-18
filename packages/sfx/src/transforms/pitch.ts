import type { PitchOptions } from '../types'
import { semitonesToRatio } from '../utils'
import { changeSpeed } from './speed'

export const applyPitch = (
  buffer: AudioBuffer,
  { semitones }: PitchOptions
): Promise<AudioBuffer> =>
  changeSpeed(buffer, { rate: semitonesToRatio(semitones) })
