# sfxlib API Spec

Web-focused sound effect generator for TypeScript. Chainable, immutable. Built on Web Audio.

## Philosophy

Browser only. Uses Web Audio API for all DSP (filters, reverb, envelopes, delays). Zero hand-rolled DSP.

Eager render. Every factory and transform fully renders through `OfflineAudioContext` and returns a new `Sfx` wrapping the resulting `AudioBuffer`. No lazy graphs.

Immutable. Every transform returns a new `Sfx`. Original stays untouched.

Chainable. Sibling feel to neiro. Same option-object style. Same naming patterns where they overlap.

## Core Type

`Sfx` is a class. Wraps an `AudioBuffer`. Exposes properties and instance methods.

Internal shape:

```ts
class Sfx {
  readonly buffer: AudioBuffer
  readonly duration: number // seconds
  readonly sampleRate: number // Hz
  readonly channels: number // channel count
}
```

## Defaults

- Sample rate: `48000` Hz
- Channels: mono (1)
- Time units: milliseconds (`durationMs`, `ms`, `startMs`, `endMs`)
- Gain units: dB
- Frequency units: Hz
- Seed: undefined = random, number = deterministic

## Shared AudioContext

One `AudioContext` is lazily created and shared across the lib for playback. `OfflineAudioContext` is created per render. Users can pass their own context via `Sfx.configure({ context })` if they already have one in their app.

```ts
Sfx.configure({ context?: AudioContext, defaultSampleRate?: number })
```

Optional. Not required for basic use.

## Loading (Static Factories)

All factories are synchronous and return a fully-rendered `Sfx`.

```ts
Sfx.fromBuffer({ buffer: AudioBuffer }): Sfx
Sfx.fromChannels({ channels: Float32Array[], sampleRate?: number }): Sfx
Sfx.silence({ durationMs: number, sampleRate?: number, channels?: number }): Sfx
```

`fromChannels` is the neiro bridge entry point.

## Primitives (Static Factories)

Raw waveforms. Each returns a fully-rendered `Sfx`.

```ts
Sfx.sine({ freq: number, durationMs: number, sampleRate?: number }): Sfx
Sfx.square({ freq: number, durationMs: number, sampleRate?: number }): Sfx
Sfx.saw({ freq: number, durationMs: number, sampleRate?: number }): Sfx
Sfx.triangle({ freq: number, durationMs: number, sampleRate?: number }): Sfx
Sfx.noise({
  durationMs: number,
  type?: "white" | "pink" | "brown",
  seed?: number,
  sampleRate?: number,
}): Sfx
```

## Game Helpers (Static Factories)

Compositions of primitives and transforms. Semantic options. Each returns a fully-rendered `Sfx`.

All helpers accept `seed?: number` and `variation?: number` (see Variation and Consistency section). Omitted from individual signatures below for readability.

```ts
Sfx.gunshot({
  caliber?: "light" | "medium" | "heavy",
  suppressed?: boolean,
  tailMs?: number,
  seed?: number,
}): Sfx

Sfx.explosion({
  size?: "small" | "medium" | "large",
  distance?: number,    // 0 to 1, farther = duller
  seed?: number,
}): Sfx

Sfx.coinPickup({
  pitch?: number,       // 1.0 default, 0.5 lower, 2.0 higher
  brightness?: number,  // 0 to 1
  seed?: number,
}): Sfx

Sfx.laserShot({
  pitch?: number,
  sweep?: "up" | "down" | "none",
  seed?: number,
}): Sfx

Sfx.jump({
  character?: "light" | "medium" | "heavy",
  seed?: number,
}): Sfx

Sfx.hit({
  material?: "flesh" | "wood" | "metal" | "stone",
  impact?: "soft" | "hard",
  seed?: number,
}): Sfx

Sfx.footstep({
  surface?: "grass" | "wood" | "stone" | "metal" | "water",
  seed?: number,
}): Sfx

Sfx.powerUp({
  style?: "arcade" | "modern" | "magical",
  seed?: number,
}): Sfx
```

v1 ships with a starter set. More helpers added without breaking anything.

## Composition (Static Factories)

```ts
Sfx.mix({ others: Sfx[] }): Sfx       // overlay, longest wins
Sfx.concat({ others: Sfx[] }): Sfx    // play back to back
```

Strict. Mismatched sample rates or channel counts throw. User calls `.resample()`, `.toMono()`, or `.toStereo()` first.

## Transforms (Instance Methods)

All immutable. All return a new `Sfx`.

### Shared with neiro (same signatures)

```ts
sfx.gain({ db: number }): Sfx
sfx.fadeIn({ ms: number }): Sfx
sfx.fadeOut({ ms: number }): Sfx
sfx.reverse(): Sfx
sfx.slice({ startMs: number, endMs: number }): Sfx
sfx.concat({ other: Sfx }): Sfx
sfx.mix({ other: Sfx }): Sfx
sfx.resample({ sampleRate: number }): Sfx
sfx.toMono(): Sfx
sfx.toStereo(): Sfx
sfx.speed({ rate: number }): Sfx  // no pitch preservation
```

### Generation-specific

```ts
sfx.envelope({
  attackMs: number,
  decayMs: number,
  sustain: number,       // 0 to 1
  releaseMs: number,
}): Sfx

sfx.lowpass({ cutoff: number, q?: number }): Sfx
sfx.highpass({ cutoff: number, q?: number }): Sfx
sfx.bandpass({ cutoff: number, q?: number }): Sfx

sfx.pitch({ semitones: number }): Sfx   // playbackRate trick, changes duration

sfx.delay({
  timeMs: number,
  feedback: number,      // 0 to 1
  wet?: number,          // 0 to 1, defaults to 0.5
}): Sfx

sfx.reverb({
  durationMs?: number,   // impulse length
  decay?: number,        // 0 to 1
  wet?: number,          // 0 to 1
}): Sfx

sfx.distortion({ amount: number }): Sfx  // 0 to 1
```

All built with native Web Audio nodes. `BiquadFilterNode` for filters. `ConvolverNode` for reverb. `DelayNode` + feedback loop for delay. `WaveShaperNode` for distortion. `GainNode` with automation for envelope.

## Properties

```ts
sfx.duration // seconds
sfx.sampleRate // Hz
sfx.channels // channel count
sfx.buffer // raw AudioBuffer, for power users
```

## Playback

```ts
sfx.play(): Promise<void>                      // resolves when sound finishes
sfx.play({ loop?: boolean, when?: number }): Promise<void>
sfx.stop(): void                               // stops active playback of this sfx
```

`play()` uses the shared context. Resumes context if suspended (browser autoplay policy). One-liner works:

```ts
Sfx.gunshot({ caliber: 'heavy' }).play()
```

`stop()` only works on a sfx instance currently playing. Returns `void` not Promise to keep it snappy.

## Export

```ts
sfx.toChannels(): { channels: Float32Array[], sampleRate: number }
sfx.toWav(): Uint8Array
sfx.toBlob({ format?: "wav" }): Blob
sfx.toUrl({ format?: "wav" }): string          // object URL, user revokes
```

`toChannels` is the neiro bridge. `toWav` and `toBlob` are browser-native exports.

## Variation and Consistency

Game helpers apply subtle random variation by default so repeated calls sound like a "family" of shots, not a tape loop. Matches modern game audio conventions.

Every helper accepts two related options:

```ts
seed?: number // deterministic randomness, same seed = same sound
variation?: number // 0 to 1, how much variation to apply (default 0.5)
```

Behavior:

- `Sfx.gunshot({ caliber: "heavy" })` → varies each call (default)
- `Sfx.gunshot({ caliber: "heavy", seed: 42 })` → same sound every call, with variation baked in
- `Sfx.gunshot({ caliber: "heavy", variation: 0 })` → canonical baseline, no variation, identical each call
- `Sfx.gunshot({ caliber: "heavy", variation: 1 })` → wilder variation per call

Primitives (`Sfx.sine`, `Sfx.square`, etc.) are deterministic by nature and take `seed` only if they involve randomness (e.g. `Sfx.noise`).

### Pooling Pattern for Games

For rapid-fire sounds, pre-generate a pool and pick randomly at play time. Zero render cost per shot.

```ts
const gunshots = Array.from({ length: 8 }, (_, i) =>
  Sfx.gunshot({ caliber: 'heavy', seed: i })
)

function fire() {
  gunshots[Math.floor(Math.random() * gunshots.length)].play()
}
```

## Example Usage

### Simplest one-liner

```ts
Sfx.gunshot({ caliber: 'heavy' }).play()
```

### Tweaked chain

```ts
Sfx.gunshot({ caliber: 'heavy' })
  .pitch({ semitones: -3 })
  .gain({ db: -6 })
  .fadeOut({ ms: 20 })
  .play()
```

### Hand-built laser

```ts
const laser = Sfx.sine({ freq: 1200, durationMs: 150 })
  .pitch({ semitones: -12 })
  .envelope({ attackMs: 1, decayMs: 30, sustain: 0.2, releaseMs: 100 })
  .lowpass({ cutoff: 2000 })
  .gain({ db: -3 })

laser.play()
```

### Layered explosion

```ts
const boom = Sfx.mix({
  others: [
    Sfx.noise({ durationMs: 800, type: 'pink', seed: 1 }).lowpass({
      cutoff: 400,
    }),
    Sfx.sine({ freq: 50, durationMs: 800 }),
  ],
})
  .envelope({ attackMs: 5, decayMs: 200, sustain: 0.3, releaseMs: 600 })
  .reverb({ durationMs: 1500, wet: 0.3 })

await boom.play()
```

### Deterministic for tests

```ts
const a = Sfx.explosion({ size: 'large', seed: 42 })
const b = Sfx.explosion({ size: 'large', seed: 42 })
// a.toChannels() and b.toChannels() are identical
```

### Sequence with silence

```ts
const beep = Sfx.sine({ freq: 880, durationMs: 100 }).envelope({
  attackMs: 1,
  decayMs: 20,
  sustain: 1,
  releaseMs: 80,
})
const gap = Sfx.silence({ durationMs: 200 })

await Sfx.concat({ others: [beep, gap, beep, gap, beep] }).play()
```

### Export to file

```ts
const wav = Sfx.gunshot({ caliber: 'heavy' }).toWav()
// save, upload, send — user's choice
```

### Bridge to neiro

```ts
import { Sfx } from 'sfxlib'
import { AudioTrack } from '@tigerabrodioss/neiro'

const raw = Sfx.gunshot({ caliber: 'heavy' })
const polished = AudioTrack.fromChannels(raw.toChannels())
  .normalize({ target: -14 })
  .fadeOut({ ms: 20 })
```

## Error Handling

Throws synchronously for:

- Invalid params (negative duration, cutoff above Nyquist, etc.)
- Sample rate mismatch in `concat` / `mix`
- Channel count mismatch in `concat` / `mix`

Playback errors (context suspended, user gesture needed) reject the `play()` promise.

## Design Principles

1. Web only. Web Audio is a hard dependency. That is the point.
2. Eager render. Every step produces a real `AudioBuffer`. Predictable, debuggable.
3. Immutable. Every transform returns a new `Sfx`.
4. Chainable. Reads left to right. Sibling feel to neiro.
5. Semantic options. Users think in "heavy caliber" not "150 Hz cutoff".
6. Native DSP. Every filter, reverb, delay uses Web Audio's battle-tested nodes.
7. Escape hatches. `buffer`, `toChannels`, and `fromChannels` let users leave the abstraction.
8. Deterministic when asked. Seeds flow through every random primitive.
