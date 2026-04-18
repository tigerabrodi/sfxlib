import type { CoinPickupOptions } from '../../types'
import { clamp } from '../../utils'
import { createHelperVariation, type HelperSfxApi } from './_variation'

const toDurationMs = (value: number): number => Math.max(10, Math.round(value))

export const createCoinPickup = (
  api: HelperSfxApi,
  options: CoinPickupOptions = {}
) => {
  const pitch = clamp(options.pitch ?? 1, 0.5, 2)
  const brightness = clamp(options.brightness ?? 0.8, 0, 1)
  const variation = createHelperVariation(options)
  const baseFreq = Math.max(460, variation.jitter(1_180 * pitch, 90 * pitch))
  const cutoff = 2_100 + brightness * 5_400
  const firstDurationMs = toDurationMs(variation.jitter(62, 6))
  const gapDurationMs = toDurationMs(variation.jitter(10, 2))
  const secondDurationMs = toDurationMs(variation.jitter(82, 8))
  const attackTick = api
    .noise({
      durationMs: toDurationMs(variation.jitter(8, 2)),
      seed: variation.nextSeed(),
      type: 'white',
    })
    .highpass({
      cutoff: Math.max(1_600, variation.jitter(2_600, 260)),
    })
    .lowpass({
      cutoff: Math.max(3_200, variation.jitter(6_200, 420)),
    })
    .envelope({
      attackMs: 0,
      decayMs: 3,
      sustain: 0.02,
      releaseMs: 8,
    })
    .gain({
      db: variation.jitter(-18 + brightness * 4, 0.8),
    })

  const firstNote = api
    .mix([
      api.square({
        freq: baseFreq,
        durationMs: firstDurationMs,
      }),
      api
        .sine({
          freq: baseFreq * 2,
          durationMs: firstDurationMs,
        })
        .gain({ db: -9 }),
      api
        .sine({
          freq: baseFreq * 3.02,
          durationMs: firstDurationMs,
        })
        .gain({ db: -18 }),
    ])
    .envelope({
      attackMs: 0,
      decayMs: 14,
      sustain: 0.08,
      releaseMs: 32,
    })
    .lowpass({
      cutoff: Math.max(2_100, variation.jitter(cutoff, 240)),
    })
    .gain({
      db: variation.jitter(-2.25 + brightness, 0.35),
    })

  const gap = api.silence({
    durationMs: gapDurationMs,
    channels: 1,
  })

  const secondNote = api
    .mix([
      api.square({
        freq: baseFreq * 1.42,
        durationMs: secondDurationMs,
      }),
      api
        .sine({
          freq: baseFreq * 2.14,
          durationMs: secondDurationMs,
        })
        .gain({ db: -8 }),
      api
        .triangle({
          freq: baseFreq * 2.86,
          durationMs: secondDurationMs,
        })
        .gain({ db: -18 }),
    ])
    .envelope({
      attackMs: 0,
      decayMs: 18,
      sustain: 0.07,
      releaseMs: 42,
    })
    .lowpass({
      cutoff: Math.max(2_400, variation.jitter(cutoff * 1.08, 260)),
    })
    .gain({
      db: variation.jitter(-1.4 + brightness, 0.35),
    })

  const sparkle = api
    .sine({
      freq: Math.max(2_400, variation.jitter(baseFreq * 3.2, 180)),
      durationMs: toDurationMs(variation.jitter(44, 6)),
    })
    .envelope({
      attackMs: 0,
      decayMs: 12,
      sustain: 0.03,
      releaseMs: 24,
    })
    .gain({
      db: variation.jitter(-18 + brightness * 5, 0.8),
    })
  const sparkleDelay = api.silence({
    durationMs: firstDurationMs + gapDurationMs,
    channels: 1,
  })
  const sparkleLayer = api.concat([sparkleDelay, sparkle])
  const sequence = api.concat([firstNote, gap, secondNote])

  return api
    .mix([attackTick, sequence, sparkleLayer])
    .gain({
      db: variation.jitter(-1.1 + brightness * 0.6, 0.35),
    })
    .reverb({
      durationMs: 120,
      decay: 0.4,
      wet: 0.06 + brightness * 0.04,
    })
    .fadeOut({ ms: 10 })
}
