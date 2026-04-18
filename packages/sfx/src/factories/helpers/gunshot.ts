import type { GunshotOptions } from '../../types'
import { createHelperVariation, type HelperSfxApi } from './_variation'

const CALIBER_PROFILES = {
  light: {
    blastMs: 82,
    crackCutoff: 4_800,
    pressureMs: 108,
    snapHighpass: 1_650,
    subFreq: 70,
    tailMs: 120,
    wet: 0.035,
  },
  medium: {
    blastMs: 102,
    crackCutoff: 4_100,
    pressureMs: 132,
    snapHighpass: 1_350,
    subFreq: 56,
    tailMs: 148,
    wet: 0.045,
  },
  heavy: {
    blastMs: 124,
    crackCutoff: 3_500,
    pressureMs: 166,
    snapHighpass: 1_020,
    subFreq: 44,
    tailMs: 182,
    wet: 0.055,
  },
} as const

const toDurationMs = (value: number): number => Math.max(10, Math.round(value))

export const createGunshot = (
  api: HelperSfxApi,
  options: GunshotOptions = {}
) => {
  const {
    caliber = 'medium',
    suppressed: isSuppressed = false,
    tailMs,
  } = options
  const variation = createHelperVariation(options)
  const profile = CALIBER_PROFILES[caliber]
  const totalTailMs = Math.max(78, Math.round(tailMs ?? profile.tailMs))
  const crackLevelDb = isSuppressed ? -8.5 : 3.2
  const blastLevelDb = isSuppressed ? -9.5 : -4.2
  const pressureLevelDb = isSuppressed ? -13.5 : -9.2
  const tailLevelDb = isSuppressed ? -20 : -16.2

  const crack = api
    .noise({
      durationMs: toDurationMs(variation.jitter(16, 2)),
      seed: variation.nextSeed(),
      type: 'white',
    })
    .highpass({
      cutoff: Math.max(680, variation.jitter(profile.snapHighpass, 120)),
    })
    .lowpass({
      cutoff: Math.max(2_400, variation.jitter(profile.crackCutoff, 260)),
    })
    .envelope({
      attackMs: 0,
      decayMs: 2,
      sustain: 0.01,
      releaseMs: 8,
    })
    .gain({
      db: variation.jitter(crackLevelDb, 0.7),
    })

  const blast = api
    .noise({
      durationMs: toDurationMs(variation.jitter(profile.blastMs, 12)),
      seed: variation.nextSeed(),
      type: 'pink',
    })
    .highpass({
      cutoff: Math.max(80, variation.jitter(isSuppressed ? 140 : 95, 20)),
    })
    .lowpass({
      cutoff: Math.max(
        1_450,
        variation.jitter(
          isSuppressed
            ? profile.crackCutoff * 0.48
            : profile.crackCutoff * 0.72,
          180
        )
      ),
    })
    .envelope({
      attackMs: 0,
      decayMs: Math.max(14, variation.jitter(20, 3)),
      sustain: isSuppressed ? 0.04 : 0.12,
      releaseMs: Math.max(26, variation.jitter(totalTailMs * 0.32, 10)),
    })
    .gain({
      db: variation.jitter(blastLevelDb, 0.8),
    })

  const pressure = api
    .noise({
      durationMs: toDurationMs(variation.jitter(profile.pressureMs, 14)),
      seed: variation.nextSeed(),
      type: 'brown',
    })
    .lowpass({
      cutoff: Math.max(120, variation.jitter(profile.subFreq * 3.8, 20)),
    })
    .envelope({
      attackMs: 0,
      decayMs: Math.max(20, variation.jitter(28, 4)),
      sustain: 0.12,
      releaseMs: Math.max(36, variation.jitter(totalTailMs * 0.42, 12)),
    })
    .gain({
      db: variation.jitter(pressureLevelDb, 0.8),
    })

  const sub = api
    .sine({
      freq: Math.max(
        30,
        variation.jitter(profile.subFreq, profile.subFreq * 0.04)
      ),
      durationMs: toDurationMs(variation.jitter(profile.pressureMs * 0.84, 10)),
    })
    .envelope({
      attackMs: 0,
      decayMs: 18,
      sustain: 0.1,
      releaseMs: Math.max(38, variation.jitter(totalTailMs * 0.34, 10)),
    })
    .gain({
      db: variation.jitter(isSuppressed ? -16 : -11.2, 0.7),
    })

  const bloom = api
    .noise({
      durationMs: toDurationMs(variation.jitter(totalTailMs * 0.62, 10)),
      seed: variation.nextSeed(),
      type: 'pink',
    })
    .bandpass({
      cutoff: Math.max(260, variation.jitter(profile.subFreq * 6.2, 24)),
      q: 0.58,
    })
    .envelope({
      attackMs: 0,
      decayMs: Math.max(16, variation.jitter(24, 4)),
      sustain: isSuppressed ? 0.03 : 0.12,
      releaseMs: Math.max(40, variation.jitter(totalTailMs * 0.44, 12)),
    })
    .gain({
      db: variation.jitter(isSuppressed ? -17.5 : -11.4, 0.8),
    })

  const tailPulse = api
    .noise({
      durationMs: toDurationMs(variation.jitter(34, 4)),
      seed: variation.nextSeed(),
      type: 'pink',
    })
    .bandpass({
      cutoff: Math.max(700, variation.jitter(profile.crackCutoff * 0.44, 110)),
      q: 0.75,
    })
    .envelope({
      attackMs: 0,
      decayMs: 9,
      sustain: 0.03,
      releaseMs: 26,
    })
    .gain({
      db: variation.jitter(tailLevelDb, 0.7),
    })
  const tailGap = api.silence({
    durationMs: toDurationMs(variation.jitter(isSuppressed ? 14 : 20, 2)),
    channels: 1,
  })
  const tail = api.concat([tailGap, tailPulse])

  let gunshot = api.mix([crack, blast, pressure, sub, bloom, tail]).highpass({
    cutoff: isSuppressed ? 48 : 24,
  })

  if (isSuppressed) {
    gunshot = gunshot
      .lowpass({
        cutoff: Math.max(720, variation.jitter(1_050, 90)),
      })
      .gain({
        db: -1.8,
      })
  } else {
    gunshot = gunshot
      .distortion({
        amount: 0.02,
      })
      .reverb({
        durationMs: 120,
        decay: 0.34,
        wet: profile.wet,
      })
      .gain({
        db: variation.jitter(2.4, 0.25),
      })
  }

  return gunshot.fadeOut({
    ms: Math.max(12, Math.round(totalTailMs * 0.16)),
  })
}
