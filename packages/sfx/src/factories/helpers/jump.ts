import type { JumpOptions } from '../../types'
import { createHelperVariation, type HelperSfxApi } from './_variation'

const CHARACTER_PROFILES = {
  light: {
    baseFreq: 540,
    segmentMs: 34,
  },
  medium: {
    baseFreq: 420,
    segmentMs: 42,
  },
  heavy: {
    baseFreq: 320,
    segmentMs: 52,
  },
} as const

const toDurationMs = (value: number): number => Math.max(10, Math.round(value))

export const createJump = (api: HelperSfxApi, options: JumpOptions = {}) => {
  const { character = 'medium' } = options
  const variation = createHelperVariation(options)
  const profile = CHARACTER_PROFILES[character]
  const segmentMs = toDurationMs(variation.jitter(profile.segmentMs, 5))
  const baseFreq = variation.jitter(profile.baseFreq, profile.baseFreq * 0.1)

  const steps = [1, 1.2, 1.45].map((ratio, index) =>
    api
      .mix([
        api.sine({
          freq: baseFreq * ratio,
          durationMs: segmentMs,
        }),
        api
          .triangle({
            freq: baseFreq * ratio * 0.5,
            durationMs: segmentMs,
          })
          .gain({ db: -13 }),
      ])
      .envelope({
        attackMs: 0,
        decayMs: 12 + index * 4,
        sustain: 0.2,
        releaseMs: 20 + index * 3,
      })
      .gain({
        db: variation.jitter(-5.5, 0.8),
      })
  )

  return api
    .concat(steps)
    .lowpass({
      cutoff: variation.jitter(2_200, 180),
    })
    .fadeOut({ ms: 20 })
}
