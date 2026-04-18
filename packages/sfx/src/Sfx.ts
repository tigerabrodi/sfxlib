import { configure } from './context'
import type { ConfigureOptions, SfxFromBufferOptions } from './types'

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
