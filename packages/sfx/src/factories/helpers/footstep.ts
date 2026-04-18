import type { FootstepOptions } from '../../types'
import { createHelperVariation, type HelperSfxApi } from './_variation'

const SURFACE_PROFILES = {
  grass: {
    bodyFreq: 88,
    cutoff: 620,
    filter: 'lowpass',
    noiseType: 'pink',
  },
  wood: {
    bodyFreq: 110,
    cutoff: 760,
    filter: 'bandpass',
    noiseType: 'pink',
  },
  stone: {
    bodyFreq: 95,
    cutoff: 980,
    filter: 'bandpass',
    noiseType: 'pink',
  },
  metal: {
    bodyFreq: 118,
    cutoff: 1_650,
    filter: 'highpass',
    noiseType: 'white',
  },
  water: {
    bodyFreq: 84,
    cutoff: 1_050,
    filter: 'bandpass',
    noiseType: 'white',
  },
} as const

const toDurationMs = (value: number): number => Math.max(8, Math.round(value))

export const createFootstep = (
  api: HelperSfxApi,
  options: FootstepOptions = {}
) => {
  const { surface = 'stone' } = options
  const variation = createHelperVariation(options)
  const profile = SURFACE_PROFILES[surface]
  const heelDurationMs = toDurationMs(variation.jitter(54, 8))
  const toeDurationMs = toDurationMs(variation.jitter(42, 6))

  const shapePulse = (
    noiseSeed: number,
    durationMs: number,
    gainDb: number
  ) => {
    let pulse = api
      .noise({
        durationMs,
        seed: noiseSeed,
        type: profile.noiseType,
      })
      .envelope({
        attackMs: 0,
        decayMs: 14,
        sustain: 0.08,
        releaseMs: 36,
      })
      .gain({ db: gainDb })

    switch (profile.filter) {
      case 'highpass':
        pulse = pulse.highpass({
          cutoff: Math.max(300, variation.jitter(profile.cutoff, 140)),
        })
        break
      case 'bandpass':
        pulse = pulse.bandpass({
          cutoff: Math.max(220, variation.jitter(profile.cutoff, 120)),
          q: 0.85,
        })
        break
      default:
        pulse = pulse.lowpass({
          cutoff: Math.max(180, variation.jitter(profile.cutoff, 90)),
        })
    }

    return pulse
  }

  const heel = shapePulse(variation.nextSeed(), heelDurationMs, -6)
  const toe = shapePulse(variation.nextSeed(), toeDurationMs, -9)
  const body = api
    .sine({
      freq: Math.max(
        55,
        variation.jitter(profile.bodyFreq, profile.bodyFreq * 0.1)
      ),
      durationMs: toDurationMs(variation.jitter(110, 14)),
    })
    .envelope({
      attackMs: 0,
      decayMs: 14,
      sustain: 0.08,
      releaseMs: 46,
    })
    .gain({
      db: variation.jitter(-15, 1),
    })
  const gap = api.silence({
    durationMs: toDurationMs(variation.jitter(16, 4)),
    channels: 1,
  })

  let step = api.mix([api.concat([heel, gap, toe]), body])

  if (surface === 'water') {
    step = step.delay({
      timeMs: 42,
      feedback: 0.15,
      wet: 0.18,
    })
  }

  if (surface === 'metal') {
    step = step.mix({
      other: api
        .sine({
          freq: variation.jitter(2_050, 120),
          durationMs: 80,
        })
        .envelope({
          attackMs: 0,
          decayMs: 12,
          sustain: 0.04,
          releaseMs: 48,
        })
        .gain({ db: -15 }),
    })
  }

  return step.fadeOut({ ms: 16 })
}
