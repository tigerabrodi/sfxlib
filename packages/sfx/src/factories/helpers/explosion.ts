import type { ExplosionOptions } from '../../types'
import { clamp } from '../../utils'
import { createHelperVariation, type HelperSfxApi } from './_variation'

const SIZE_PROFILES = {
  small: {
    bodyFreq: 72,
    noiseMs: 480,
    reverbMs: 360,
    rumbleMs: 420,
    wet: 0.12,
  },
  medium: {
    bodyFreq: 52,
    noiseMs: 760,
    reverbMs: 620,
    rumbleMs: 640,
    wet: 0.18,
  },
  large: {
    bodyFreq: 38,
    noiseMs: 1_080,
    reverbMs: 950,
    rumbleMs: 920,
    wet: 0.24,
  },
} as const

const toDurationMs = (value: number): number => Math.max(24, Math.round(value))

export const createExplosion = (
  api: HelperSfxApi,
  options: ExplosionOptions = {}
) => {
  const { size = 'medium', distance = 0 } = options
  const variation = createHelperVariation(options)
  const profile = SIZE_PROFILES[size]
  const clampedDistance = clamp(distance, 0, 1)
  const nearCutoff = (1 - clampedDistance) * 4_100 + 1_050
  const detailCutoff = (1 - clampedDistance) * 5_200 + 950

  const impact = api
    .noise({
      durationMs: toDurationMs(variation.jitter(68, 10)),
      seed: variation.nextSeed(),
      type: 'white',
    })
    .highpass({
      cutoff: Math.max(
        420,
        variation.jitter(780 + (1 - clampedDistance) * 380, 80)
      ),
    })
    .lowpass({
      cutoff: Math.max(
        1_200,
        variation.jitter(3_600 - clampedDistance * 1_200, 250)
      ),
    })
    .envelope({
      attackMs: 0,
      decayMs: 20,
      sustain: 0.05,
      releaseMs: 62,
    })
    .gain({
      db: variation.jitter(-8.5 - clampedDistance * 4, 1),
    })

  const blast = api
    .noise({
      durationMs: toDurationMs(
        variation.jitter(profile.noiseMs, profile.noiseMs * 0.12)
      ),
      seed: variation.nextSeed(),
      type: 'pink',
    })
    .lowpass({
      cutoff: Math.max(450, variation.jitter(nearCutoff, 420)),
    })
    .envelope({
      attackMs: 0,
      decayMs: Math.max(95, variation.jitter(profile.noiseMs * 0.22, 40)),
      sustain: 0.24,
      releaseMs: Math.max(160, variation.jitter(profile.noiseMs * 0.62, 80)),
    })
    .gain({
      db: variation.jitter(-2.25 - clampedDistance * 4, 1.1),
    })

  const rumble = api
    .noise({
      durationMs: toDurationMs(
        variation.jitter(profile.rumbleMs, profile.rumbleMs * 0.1)
      ),
      seed: variation.nextSeed(),
      type: 'brown',
    })
    .lowpass({
      cutoff: Math.max(
        120,
        variation.jitter(220 + (1 - clampedDistance) * 180, 36)
      ),
    })
    .envelope({
      attackMs: 8,
      decayMs: Math.max(110, variation.jitter(profile.rumbleMs * 0.3, 45)),
      sustain: 0.32,
      releaseMs: Math.max(170, variation.jitter(profile.rumbleMs * 0.56, 65)),
    })
    .gain({
      db: variation.jitter(-6.6, 1),
    })

  const sub = api
    .mix([
      api.sine({
        freq: Math.max(
          28,
          variation.jitter(profile.bodyFreq, profile.bodyFreq * 0.15)
        ),
        durationMs: toDurationMs(variation.jitter(profile.rumbleMs * 0.76, 55)),
      }),
      api
        .sine({
          freq: Math.max(
            22,
            variation.jitter(profile.bodyFreq * 0.52, profile.bodyFreq * 0.08)
          ),
          durationMs: toDurationMs(
            variation.jitter(profile.rumbleMs * 0.92, 60)
          ),
        })
        .gain({
          db: -6,
        }),
    ])
    .envelope({
      attackMs: 0,
      decayMs: Math.max(74, variation.jitter(160, 22)),
      sustain: 0.16,
      releaseMs: Math.max(170, variation.jitter(profile.rumbleMs * 0.62, 70)),
    })
    .gain({
      db: variation.jitter(-4.8, 0.9),
    })

  const debris = api
    .noise({
      durationMs: toDurationMs(variation.jitter(160, 30)),
      seed: variation.nextSeed(),
      type: 'white',
    })
    .highpass({
      cutoff: Math.max(
        900,
        variation.jitter(1_650 * (1 - clampedDistance * 0.6), 220)
      ),
    })
    .envelope({
      attackMs: 0,
      decayMs: 35,
      sustain: 0.04,
      releaseMs: 90,
    })
    .gain({
      db: variation.jitter(-15 - clampedDistance * 6, 1.2),
    })

  return api
    .mix([impact, blast, rumble, sub, debris])
    .lowpass({
      cutoff: Math.max(600, variation.jitter(detailCutoff, 560)),
    })
    .distortion({
      amount: 0.035,
    })
    .reverb({
      durationMs: Math.round(profile.reverbMs * 1.1),
      decay: clamp(0.48 + profile.wet, 0, 1),
      wet: clamp(profile.wet + (1 - clampedDistance) * 0.1, 0, 0.45),
    })
}
