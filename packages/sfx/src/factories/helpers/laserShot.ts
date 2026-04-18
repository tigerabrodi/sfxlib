import type { LaserShotOptions } from '../../types'
import { clamp } from '../../utils'
import { createHelperVariation, type HelperSfxApi } from './_variation'

const toDurationMs = (value: number): number => Math.max(10, Math.round(value))

const SWEEP_RATIOS = {
  down: [1.95, 1.48, 1.08, 0.76],
  none: [1.22, 1.18, 1.14, 1.1],
  up: [0.8, 1.04, 1.38, 1.82],
} as const

export const createLaserShot = (
  api: HelperSfxApi,
  options: LaserShotOptions = {}
) => {
  const pitch = clamp(options.pitch ?? 1, 0.5, 2)
  const sweep = options.sweep ?? 'down'
  const variation = createHelperVariation(options)
  const baseFreq = Math.max(320, variation.jitter(1_180 * pitch, 120 * pitch))
  const segmentMs = toDurationMs(variation.jitter(22, 4))
  const click = api
    .noise({
      durationMs: toDurationMs(variation.jitter(12, 2)),
      seed: variation.nextSeed(),
      type: 'white',
    })
    .highpass({
      cutoff: Math.max(1_400, variation.jitter(2_050 * pitch, 220)),
    })
    .lowpass({
      cutoff: Math.max(2_500, variation.jitter(5_400 * pitch, 420)),
    })
    .envelope({
      attackMs: 0,
      decayMs: 4,
      sustain: 0.02,
      releaseMs: 10,
    })
    .gain({
      db: variation.jitter(-9.5, 1),
    })
  const segments = SWEEP_RATIOS[sweep].map((ratio, index) =>
    api
      .mix([
        api.square({
          freq: baseFreq * ratio,
          durationMs: segmentMs,
        }),
        api
          .sine({
            freq: baseFreq * ratio * 2.02,
            durationMs: segmentMs,
          })
          .gain({ db: -15 }),
      ])
      .envelope({
        attackMs: 0,
        decayMs: 8 + index,
        sustain: 0.05,
        releaseMs: 12 + index * 2,
      })
      .gain({
        db: variation.jitter(-6.2, 0.8),
      })
  )
  const tail = api
    .noise({
      durationMs: toDurationMs(variation.jitter(26, 4)),
      seed: variation.nextSeed(),
      type: 'white',
    })
    .bandpass({
      cutoff: Math.max(1_500, variation.jitter(2_400 * pitch, 260)),
      q: 1.1,
    })
    .envelope({
      attackMs: 0,
      decayMs: 8,
      sustain: 0.03,
      releaseMs: 18,
    })
    .gain({
      db: variation.jitter(-16, 1.1),
    })

  return api
    .mix([click, api.concat(segments), tail])
    .highpass({
      cutoff: Math.max(180, variation.jitter(320, 45)),
    })
    .bandpass({
      cutoff: Math.max(1_100, variation.jitter(2_350 * pitch, 260)),
      q: 1.15,
    })
    .distortion({ amount: 0.075 })
    .fadeOut({ ms: 12 })
}
