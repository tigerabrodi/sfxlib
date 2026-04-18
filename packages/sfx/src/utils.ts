export const dbToGain = (db: number): number => 10 ** (db / 20)

export const gainToDb = (gain: number): number => 20 * Math.log10(gain)

export const msToSamples = (milliseconds: number, sampleRate: number): number =>
  Math.round((milliseconds / 1000) * sampleRate)

export const samplesToMs = (samples: number, sampleRate: number): number =>
  (samples / sampleRate) * 1000

export const semitonesToRatio = (semitones: number): number =>
  2 ** (semitones / 12)

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)
