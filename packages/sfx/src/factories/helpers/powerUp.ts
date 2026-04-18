import type { PowerUpOptions } from '../../types'
import { createHelperVariation, type HelperSfxApi } from './_variation'

const STYLE_PROFILES = {
  arcade: {
    baseFreq: 520,
    gapMs: 10,
    noteMs: 68,
    reverbMs: 120,
    wet: 0.08,
    wave: 'square',
  },
  modern: {
    baseFreq: 430,
    gapMs: 14,
    noteMs: 78,
    reverbMs: 220,
    wet: 0.16,
    wave: 'triangle',
  },
  magical: {
    baseFreq: 470,
    gapMs: 18,
    noteMs: 92,
    reverbMs: 460,
    wet: 0.24,
    wave: 'sine',
  },
} as const

const toDurationMs = (value: number): number => Math.max(12, Math.round(value))

export const createPowerUp = (
  api: HelperSfxApi,
  options: PowerUpOptions = {}
) => {
  const { style = 'arcade' } = options
  const variation = createHelperVariation(options)
  const profile = STYLE_PROFILES[style]
  const baseFreq = variation.jitter(profile.baseFreq, profile.baseFreq * 0.08)
  const gapMs = toDurationMs(variation.jitter(profile.gapMs, 3))
  let createVoice = api.sine

  if (profile.wave === 'square') {
    createVoice = api.square
  } else if (profile.wave === 'triangle') {
    createVoice = api.triangle
  }
  const parts = [1, 1.25, 1.5, 2].flatMap((ratio, index, ratios) => {
    const durationMs = toDurationMs(
      variation.jitter(
        index === ratios.length - 1 ? profile.noteMs * 1.25 : profile.noteMs,
        8
      )
    )
    const note = api
      .mix([
        createVoice({
          freq: baseFreq * ratio,
          durationMs,
        }),
        api
          .sine({
            freq: baseFreq * ratio * 1.5,
            durationMs,
          })
          .gain({ db: -11 }),
      ])
      .envelope({
        attackMs: 0,
        decayMs: 18,
        sustain: 0.18,
        releaseMs: style === 'magical' ? 70 : 42,
      })
      .gain({
        db: variation.jitter(-6, 0.8),
      })

    if (index === ratios.length - 1) {
      return [note]
    }

    return [
      note,
      api.silence({
        durationMs: gapMs,
        channels: 1,
      }),
    ]
  })

  let powerUp = api.concat(parts)

  if (style === 'modern') {
    powerUp = powerUp.delay({
      timeMs: 62,
      feedback: 0.22,
      wet: 0.14,
    })
  }

  powerUp = powerUp.reverb({
    durationMs: profile.reverbMs,
    decay: style === 'magical' ? 0.72 : 0.5,
    wet: profile.wet,
  })

  if (style === 'arcade') {
    powerUp = powerUp.distortion({ amount: 0.03 })
  }

  return powerUp.fadeOut({ ms: 18 })
}
