import { configure, getSharedContext } from './context'
import { msToSamples } from './utils'
import type {
  ConfigureOptions,
  SfxFromBufferOptions,
  SfxFromChannelsOptions,
  SfxSilenceOptions,
} from './types'

interface SfxOptions {
  readonly bufferPromise: Promise<AudioBuffer>
  readonly duration: number
  readonly sampleRate: number
  readonly channels: number
}

export class Sfx {
  readonly #bufferPromise: Promise<AudioBuffer>
  readonly #duration: number
  readonly #sampleRate: number
  readonly #channels: number

  private constructor({
    bufferPromise,
    duration,
    sampleRate,
    channels,
  }: SfxOptions) {
    this.#bufferPromise = bufferPromise
    this.#duration = duration
    this.#sampleRate = sampleRate
    this.#channels = channels

    Object.freeze(this)
  }

  static configure(options: ConfigureOptions): void {
    configure(options)
  }

  static fromBuffer({ buffer }: SfxFromBufferOptions): Sfx {
    return new Sfx({
      bufferPromise: Promise.resolve(buffer),
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
    })
  }

  static fromChannels({
    channels,
    sampleRate = getSharedContext().sampleRate,
  }: SfxFromChannelsOptions): Sfx {
    const channelCount = channels.length
    const length = channels[0]?.length ?? 0
    const buffer = getSharedContext().createBuffer(
      channelCount,
      length,
      sampleRate
    )

    for (const [channelIndex, samples] of channels.entries()) {
      buffer.getChannelData(channelIndex).set(samples)
    }

    return Sfx.fromBuffer({ buffer })
  }

  static silence({
    durationMs,
    sampleRate = getSharedContext().sampleRate,
    channels = 1,
  }: SfxSilenceOptions): Sfx {
    const length = Math.max(1, msToSamples(durationMs, sampleRate))
    const buffer = getSharedContext().createBuffer(channels, length, sampleRate)

    return Sfx.fromBuffer({ buffer })
  }

  get duration(): number {
    return this.#duration
  }

  get sampleRate(): number {
    return this.#sampleRate
  }

  get channels(): number {
    return this.#channels
  }

  getBuffer(): Promise<AudioBuffer> {
    return this.#bufferPromise
  }
}
