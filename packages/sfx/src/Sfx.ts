import { configure, createOfflineContext, getSharedContext } from './context'
import { createCoinPickup } from './factories/helpers/coinPickup'
import { createExplosion } from './factories/helpers/explosion'
import { createFootstep } from './factories/helpers/footstep'
import { createGunshot } from './factories/helpers/gunshot'
import { createHit } from './factories/helpers/hit'
import { createJump } from './factories/helpers/jump'
import { createLaserShot } from './factories/helpers/laserShot'
import { createPowerUp } from './factories/helpers/powerUp'
import type { HelperSfxApi } from './factories/helpers/_variation'
import { createRng } from './rng'
import { clamp, msToSamples, semitonesToRatio } from './utils'
import { toMonoBuffer, toStereoBuffer } from './transforms/channels'
import { concatBuffers } from './transforms/concat'
import { applyDelay, estimateDelayDurationSeconds } from './transforms/delay'
import { applyDistortion } from './transforms/distortion'
import { applyEnvelope } from './transforms/envelope'
import { applyFadeIn, applyFadeOut } from './transforms/fade'
import {
  applyBandpass,
  applyHighpass,
  applyLowpass,
} from './transforms/filters'
import { applyGain } from './transforms/gain'
import { mixBuffers } from './transforms/mix'
import { applyPitch } from './transforms/pitch'
import { resampleBuffer } from './transforms/resample'
import { applyReverb, estimateReverbDurationSeconds } from './transforms/reverb'
import { reverseBuffer } from './transforms/reverse'
import { sliceBuffer } from './transforms/slice'
import { changeSpeed } from './transforms/speed'
import type {
  CoinPickupOptions,
  ConfigureOptions,
  DelayOptions,
  DistortionOptions,
  EnvelopeOptions,
  ExplosionOptions,
  FadeOptions,
  FilterOptions,
  FootstepOptions,
  GainOptions,
  GunshotOptions,
  HitOptions,
  JumpOptions,
  NoiseType,
  LaserShotOptions,
  PitchOptions,
  PowerUpOptions,
  ResampleOptions,
  ReverbOptions,
  SfxFromBufferOptions,
  SfxFromChannelsOptions,
  SfxNoiseOptions,
  SfxOscillatorOptions,
  SfxSilenceOptions,
  SliceOptions,
  SpeedOptions,
} from './types'

interface SfxOptions {
  readonly bufferPromise: Promise<AudioBuffer>
  readonly duration: number
  readonly sampleRate: number
  readonly channels: number
}

interface StaticCompositionOptions {
  readonly others: Array<Sfx>
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

const createHelperApi = (): HelperSfxApi => ({
  sine: (options) => Sfx.sine(options),
  square: (options) => Sfx.square(options),
  saw: (options) => Sfx.saw(options),
  triangle: (options) => Sfx.triangle(options),
  noise: (options) => Sfx.noise(options),
  silence: (options) => Sfx.silence(options),
  mix: (others) => Sfx.mix({ others }),
  concat: (others) => Sfx.concat({ others }),
})

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

  #frameCount(): number {
    return Math.max(1, Math.round(this.#duration * this.#sampleRate))
  }

  #derive(
    bufferPromise: Promise<AudioBuffer>,
    {
      duration = this.#duration,
      sampleRate = this.#sampleRate,
      channels = this.#channels,
    }: Partial<Omit<SfxOptions, 'bufferPromise'>> = {}
  ): Sfx {
    return Sfx.create({
      bufferPromise,
      duration,
      sampleRate,
      channels,
    })
  }

  #assertMatchingFormat(other: Sfx): void {
    if (
      this.#sampleRate !== other.#sampleRate ||
      this.#channels !== other.#channels
    ) {
      throw new Error('Sample rate and channel count must match')
    }
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

  static gunshot(options: GunshotOptions = {}): Sfx {
    return createGunshot(createHelperApi(), options)
  }

  static explosion(options: ExplosionOptions = {}): Sfx {
    return createExplosion(createHelperApi(), options)
  }

  static coinPickup(options: CoinPickupOptions = {}): Sfx {
    return createCoinPickup(createHelperApi(), options)
  }

  static laserShot(options: LaserShotOptions = {}): Sfx {
    return createLaserShot(createHelperApi(), options)
  }

  static jump(options: JumpOptions = {}): Sfx {
    return createJump(createHelperApi(), options)
  }

  static hit(options: HitOptions = {}): Sfx {
    return createHit(createHelperApi(), options)
  }

  static footstep(options: FootstepOptions = {}): Sfx {
    return createFootstep(createHelperApi(), options)
  }

  static powerUp(options: PowerUpOptions = {}): Sfx {
    return createPowerUp(createHelperApi(), options)
  }

  static concat({ others }: StaticCompositionOptions): Sfx {
    const [first, ...rest] = others

    if (first === undefined) {
      throw new Error('Static concat requires at least one Sfx')
    }

    return rest.reduce((current, other) => current.concat({ other }), first)
  }

  static mix({ others }: StaticCompositionOptions): Sfx {
    const [first, ...rest] = others

    if (first === undefined) {
      throw new Error('Static mix requires at least one Sfx')
    }

    return rest.reduce((current, other) => current.mix({ other }), first)
  }

  gain(options: GainOptions): Sfx {
    return this.#derive(
      this.#bufferPromise.then((buffer) => applyGain(buffer, options))
    )
  }

  fadeIn(options: FadeOptions): Sfx {
    return this.#derive(
      this.#bufferPromise.then((buffer) => applyFadeIn(buffer, options))
    )
  }

  fadeOut(options: FadeOptions): Sfx {
    return this.#derive(
      this.#bufferPromise.then((buffer) => applyFadeOut(buffer, options))
    )
  }

  reverse(): Sfx {
    return this.#derive(
      this.#bufferPromise.then((buffer) => reverseBuffer(buffer))
    )
  }

  slice(options: SliceOptions): Sfx {
    const startSample = clamp(
      msToSamples(options.startMs, this.#sampleRate),
      0,
      this.#frameCount()
    )
    const endSample = clamp(
      msToSamples(options.endMs, this.#sampleRate),
      startSample,
      this.#frameCount()
    )
    const length = Math.max(1, endSample - startSample)

    return this.#derive(
      this.#bufferPromise.then((buffer) => sliceBuffer(buffer, options)),
      { duration: length / this.#sampleRate }
    )
  }

  concat({ other }: { other: Sfx }): Sfx {
    this.#assertMatchingFormat(other)

    const length = this.#frameCount() + other.#frameCount()

    return this.#derive(
      Promise.all([this.#bufferPromise, other.#bufferPromise]).then(
        ([first, second]) => concatBuffers(first, second)
      ),
      { duration: length / this.#sampleRate }
    )
  }

  mix({ other }: { other: Sfx }): Sfx {
    this.#assertMatchingFormat(other)

    const length = Math.max(this.#frameCount(), other.#frameCount())

    return this.#derive(
      Promise.all([this.#bufferPromise, other.#bufferPromise]).then(
        ([first, second]) => mixBuffers(first, second)
      ),
      { duration: length / this.#sampleRate }
    )
  }

  resample(options: ResampleOptions): Sfx {
    const length = Math.max(1, Math.round(this.#duration * options.sampleRate))

    return this.#derive(
      this.#bufferPromise.then((buffer) => resampleBuffer(buffer, options)),
      {
        duration: length / options.sampleRate,
        sampleRate: options.sampleRate,
      }
    )
  }

  toMono(): Sfx {
    return this.#derive(
      this.#bufferPromise.then((buffer) => toMonoBuffer(buffer)),
      {
        channels: 1,
      }
    )
  }

  toStereo(): Sfx {
    return this.#derive(
      this.#bufferPromise.then((buffer) => toStereoBuffer(buffer)),
      {
        channels: 2,
      }
    )
  }

  speed(options: SpeedOptions): Sfx {
    const length = Math.max(1, Math.round(this.#frameCount() / options.rate))

    return this.#derive(
      this.#bufferPromise.then((buffer) => changeSpeed(buffer, options)),
      { duration: length / this.#sampleRate }
    )
  }

  envelope(options: EnvelopeOptions): Sfx {
    return this.#derive(
      this.#bufferPromise.then((buffer) => applyEnvelope(buffer, options))
    )
  }

  lowpass(options: FilterOptions): Sfx {
    return this.#derive(
      this.#bufferPromise.then((buffer) => applyLowpass(buffer, options))
    )
  }

  highpass(options: FilterOptions): Sfx {
    return this.#derive(
      this.#bufferPromise.then((buffer) => applyHighpass(buffer, options))
    )
  }

  bandpass(options: FilterOptions): Sfx {
    return this.#derive(
      this.#bufferPromise.then((buffer) => applyBandpass(buffer, options))
    )
  }

  pitch(options: PitchOptions): Sfx {
    const ratio = semitonesToRatio(options.semitones)
    const length = Math.max(1, Math.round(this.#frameCount() / ratio))

    return this.#derive(
      this.#bufferPromise.then((buffer) => applyPitch(buffer, options)),
      { duration: length / this.#sampleRate }
    )
  }

  delay(options: DelayOptions): Sfx {
    const duration = estimateDelayDurationSeconds(this.#duration, options)

    return this.#derive(
      this.#bufferPromise.then((buffer) => applyDelay(buffer, options)),
      { duration }
    )
  }

  reverb(options: ReverbOptions): Sfx {
    const duration = estimateReverbDurationSeconds(this.#duration, options)

    return this.#derive(
      this.#bufferPromise.then((buffer) => applyReverb(buffer, options)),
      { duration }
    )
  }

  distortion(options: DistortionOptions): Sfx {
    return this.#derive(
      this.#bufferPromise.then((buffer) => applyDistortion(buffer, options))
    )
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
