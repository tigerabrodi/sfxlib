import { Sfx } from '../Sfx'
import type {
  SfxFromBufferOptions,
  SfxFromChannelsOptions,
  SfxSilenceOptions,
} from '../types'

export const fromBuffer = (options: SfxFromBufferOptions): Sfx =>
  Sfx.fromBuffer(options)

export const fromChannels = (options: SfxFromChannelsOptions): Sfx =>
  Sfx.fromChannels(options)

export const silence = (options: SfxSilenceOptions): Sfx => Sfx.silence(options)
