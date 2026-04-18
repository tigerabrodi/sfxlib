import { Sfx } from '../Sfx'
import type { SfxNoiseOptions, SfxOscillatorOptions } from '../types'

export const sine = (options: SfxOscillatorOptions): Sfx => Sfx.sine(options)

export const square = (options: SfxOscillatorOptions): Sfx =>
  Sfx.square(options)

export const saw = (options: SfxOscillatorOptions): Sfx => Sfx.saw(options)

export const triangle = (options: SfxOscillatorOptions): Sfx =>
  Sfx.triangle(options)

export const noise = (options: SfxNoiseOptions): Sfx => Sfx.noise(options)
