import { configure, createOfflineContext, getSharedContext } from './context'
import { createRng } from './rng'
import { clamp, msToSamples } from './utils'
import type {
  ConfigureOptions,
  NoiseType,
  SfxFromBufferOptions,
  SfxFromChannelsOptions,
  SfxNoiseOptions,
  SfxOscillatorOptions,
  SfxSilenceOptions,
} from './types'

interface SfxOptions {
  readonly bufferPromise: Promise<AudioBuffer>
  readonly duration: number
  readonly sampleRate: number
  readonly channels: number
}

const SAWTOOTH: OscillatorType = 'sawtooth'

const normalizeIfNeeded = (samples: Float32Array): void => {
  let peak = 0

  for (const sample of samples) {
    const magnitude = Math.abs(sample)

    if (magnitude > peak) {
      peak = magnitude
    }
  }

  if (peak <= 1) {
    return
  }

  const scale = 1 / peak

  for (let index = 0; index < samples.length; index += 1) {
    samples[index] *= scale
  }
}

const removeDcOffset = (samples: Float32Array): void => {
  let total = 0

  for (const sample of samples) {
    total += sample
  }

  const mean = total / samples.length

  for (let index = 0; index < samples.length; index += 1) {
    samples[index] -= mean
  }
}

const fillWhiteNoise = (samples: Float32Array, rng: () => number): void => {
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = rng() * 2 - 1
  }
}

const fillPinkNoise = (samples: Float32Array, rng: () => number): void => {
  let b0 = 0
  let b1 = 0
  let b2 = 0
  let b3 = 0
  let b4 = 0
  let b5 = 0
  let b6 = 0

  for (let index = 0; index < samples.length; index += 1) {
    const white = rng() * 2 - 1

    b0 = 0.99886 * b0 + 0.0555179 * white
    b1 = 0.99332 * b1 + 0.0750759 * white
    b2 = 0.969 * b2 + 0.153852 * white
    b3 = 0.8665 * b3 + 0.3104856 * white
    b4 = 0.55 * b4 + 0.5329522 * white
    b5 = -0.7616 * b5 - 0.016898 * white

    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + 0.5362 * white

    b6 = 0.115926 * white
    samples[index] = clamp(pink * 0.11, -1, 1)
  }
}

const fillBrownNoise = (samples: Float32Array, rng: () => number): void => {
  let last = 0

  for (let index = 0; index < samples.length; index += 1) {
    const white = rng() * 2 - 1

    last = (last + 0.02 * white) / 1.02
    samples[index] = last * 3.5
  }

  removeDcOffset(samples)
  normalizeIfNeeded(samples)
}

const fillNoise = (
  samples: Float32Array,
  type: NoiseType,
  rng: () => number
): void => {
  switch (type) {
    case 'pink':
      fillPinkNoise(samples, rng)
      return
    case 'brown':
      fillBrownNoise(samples, rng)
      return
    default:
      fillWhiteNoise(samples, rng)
  }
}

const renderOscillator = (
  type: OscillatorType,
  { freq, durationMs, sampleRate }: SfxOscillatorOptions
): {
  bufferPromise: Promise<AudioBuffer>
  channels: number
  duration: number
  sampleRate: number
} => {
  const offlineContext = createOfflineContext(
    sampleRate === undefined
      ? { durationMs, channels: 1 }
      : { durationMs, sampleRate, channels: 1 }
  )
  const oscillator = offlineContext.createOscillator()
  const duration = offlineContext.length / offlineContext.sampleRate

  oscillator.type = type
  oscillator.frequency.value = freq
  oscillator.connect(offlineContext.destination)
  oscillator.start(0)
  oscillator.stop(duration)

  return {
    bufferPromise: offlineContext.startRendering(),
    channels: 1,
    duration,
    sampleRate: offlineContext.sampleRate,
  }
}

const renderNoise = ({
  durationMs,
  sampleRate,
  seed,
  type = 'white',
}: SfxNoiseOptions): {
  bufferPromise: Promise<AudioBuffer>
  channels: number
  duration: number
  sampleRate: number
} => {
  const offlineContext = createOfflineContext(
    sampleRate === undefined
      ? { durationMs, channels: 1 }
      : { durationMs, sampleRate, channels: 1 }
  )
  const source = offlineContext.createBufferSource()
  const buffer = offlineContext.createBuffer(
    1,
    offlineContext.length,
    offlineContext.sampleRate
  )
  const samples = buffer.getChannelData(0)
  const rng = createRng(seed)
  const duration = offlineContext.length / offlineContext.sampleRate

  fillNoise(samples, type, rng)

  source.buffer = buffer
  source.connect(offlineContext.destination)
  source.start(0)

  return {
    bufferPromise: offlineContext.startRendering(),
    channels: 1,
    duration,
    sampleRate: offlineContext.sampleRate,
  }
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

  private static create(options: SfxOptions): Sfx {
    return new Sfx(options)
  }

  static configure(options: ConfigureOptions): void {
    configure(options)
  }

  static fromBuffer({ buffer }: SfxFromBufferOptions): Sfx {
    return Sfx.create({
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

  static sine(options: SfxOscillatorOptions): Sfx {
    return Sfx.create(renderOscillator('sine', options))
  }

  static square(options: SfxOscillatorOptions): Sfx {
    return Sfx.create(renderOscillator('square', options))
  }

  static saw(options: SfxOscillatorOptions): Sfx {
    return Sfx.create(renderOscillator(SAWTOOTH, options))
  }

  static triangle(options: SfxOscillatorOptions): Sfx {
    return Sfx.create(renderOscillator('triangle', options))
  }

  static noise(options: SfxNoiseOptions): Sfx {
    return Sfx.create(renderNoise(options))
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
