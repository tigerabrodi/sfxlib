import type { HitOptions } from '../../types'
import { createHelperVariation, type HelperSfxApi } from './_variation'

const MATERIAL_PROFILES = {
  flesh: {
    bodyFreq: 110,
    cutoff: 320,
    filter: 'lowpass',
    noiseMs: 95,
    noiseType: 'brown',
    ringFreq: 0,
    ringGainDb: -20,
  },
  wood: {
    bodyFreq: 240,
    cutoff: 780,
    filter: 'bandpass',
    noiseMs: 105,
    noiseType: 'pink',
    ringFreq: 520,
    ringGainDb: -13,
  },
  metal: {
    bodyFreq: 190,
    cutoff: 1_550,
    filter: 'highpass',
    noiseMs: 120,
    noiseType: 'white',
    ringFreq: 1_950,
    ringGainDb: -8,
  },
  stone: {
    bodyFreq: 170,
    cutoff: 920,
    filter: 'bandpass',
    noiseMs: 110,
    noiseType: 'pink',
    ringFreq: 760,
    ringGainDb: -10.5,
  },
} as const

const toDurationMs = (value: number): number => Math.max(10, Math.round(value))

export const createHit = (api: HelperSfxApi, options: HitOptions = {}) => {
  const { impact = 'hard', material = 'stone' } = options
  const variation = createHelperVariation(options)
  const profile = MATERIAL_PROFILES[material]
  const impactScale = impact === 'hard' ? 1 : 0.75
  const burstDurationMs = toDurationMs(
    variation.jitter(profile.noiseMs * impactScale, 14)
  )
  let burst = api
    .noise({
      durationMs: burstDurationMs,
      seed: variation.nextSeed(),
      type: profile.noiseType,
    })
    .envelope({
      attackMs: 0,
      decayMs: 18,
      sustain: impact === 'hard' ? 0.14 : 0.08,
      releaseMs: impact === 'hard' ? 68 : 48,
    })
    .gain({
      db: variation.jitter(impact === 'hard' ? -4.5 : -7, 1),
    })

  switch (profile.filter) {
    case 'highpass':
      burst = burst.highpass({
        cutoff: Math.max(220, variation.jitter(profile.cutoff, 160)),
      })
      break
    case 'bandpass':
      burst = burst.bandpass({
        cutoff: Math.max(180, variation.jitter(profile.cutoff, 150)),
        q: 0.95,
      })
      break
    default:
      burst = burst.lowpass({
        cutoff: Math.max(160, variation.jitter(profile.cutoff, 80)),
      })
  }

  const body = api
    .sine({
      freq: Math.max(
        70,
        variation.jitter(profile.bodyFreq, profile.bodyFreq * 0.12)
      ),
      durationMs: toDurationMs(variation.jitter(120 * impactScale, 16)),
    })
    .envelope({
      attackMs: 0,
      decayMs: 18,
      sustain: 0.1,
      releaseMs: 52,
    })
    .gain({
      db: variation.jitter(-11.5, 1),
    })

  const layers = [burst, body]

  if (profile.ringFreq > 0) {
    const ring = api
      .sine({
        freq: Math.max(
          180,
          variation.jitter(profile.ringFreq, profile.ringFreq * 0.08)
        ),
        durationMs: toDurationMs(
          variation.jitter(impact === 'hard' ? 120 : 90, 14)
        ),
      })
      .envelope({
        attackMs: 0,
        decayMs: 12,
        sustain: 0.06,
        releaseMs: material === 'metal' ? 130 : 72,
      })
      .gain({
        db: variation.jitter(profile.ringGainDb, 1.2),
      })

    layers.push(ring)
  }

  return api.mix(layers).fadeOut({ ms: 18 })
}
