# sfxlib build plan

Web-focused sound effect generator. Chainable, immutable. Built on Web Audio. Sibling feel to neiro.

The source of truth for the public API is [SPEC.md](./SPEC.md). Refinements and overrides live in [DECISIONS.md](./DECISIONS.md) — read that before writing code; the return types there win over the spec where they differ.

This plan slices the spec + decisions into batches we can land, test, and listen to before moving on. Each batch ends with acceptance criteria. Don't move to the next batch until the current one is green.

---

## Testing strategy

Web Audio lives in the browser. There's no honest way to unit-test `OfflineAudioContext`, `BiquadFilterNode`, `ConvolverNode` in Node. So we split tests two ways:

### Unit (Node, plain Vitest)

Only for pure logic. No Web Audio.

- Seeded RNG (mulberry32 or similar) — determinism, distribution.
- Math helpers (`dbToGain`, `gainToDb`, `msToSamples`, `semitonesToRatio`, clamp).
- Parameter validators (negative durations throw, cutoff-above-Nyquist throws).
- WAV encoder (takes `{ channels: Float32Array[], sampleRate }`, returns `Uint8Array`). Self-contained, no Web Audio needed. We can assert on the RIFF bytes.

File naming: `*.test.ts`. Runs via `bun run test:unit`.

### Browser (Vitest browser mode, Playwright Chromium)

Anything that touches `AudioContext` or `OfflineAudioContext`.

- Primitives produce buffers of the right duration, channel count, sample rate.
- Transforms return new `Sfx` instances (immutability check).
- Filter math sanity: lowpass reduces high-frequency RMS, highpass reduces low-frequency RMS.
- Envelope shape: zero at start, peaks by attack, decays to sustain, fades to zero.
- Determinism: same seed produces byte-identical buffers.
- Game helpers don't throw and produce sane duration/loudness ranges.

File naming: `*.browser.test.ts`. Runs via `bun run test:browser`.

### Listen tests live in the playground, not in Vitest

Audio tests that pass mathematically still need ear checks. Don't try to do this in Vitest. Scrubbing a folder of `tests/_output/*.wav` burns your attention fast. Instead, the `/packages/playground` Vite app is the ear-test tool (see Playground section below). Scroll a page, click buttons, hear stuff.

Keep an `SFXLIB_DUMP=1` escape hatch in helper browser tests for the Batch 8 regression pass — dump each helper's seeded + varied outputs so you can keep a reference set around, and so a reviewer can listen without running the playground. Off by default so CI stays fast.

### Rule of thumb

- Pure number in, number out → unit test.
- Anything that ends in an `AudioBuffer` → browser test for shape, property, determinism.
- "Does this sound right" → playground. Eyes and ears, not assertions.

---

## Batches

### Batch 0: Scaffold (done)

Monorepo layout. `packages/sfx` is the only package. Vite library build, dts rollup. Vitest workspace with `unit` + `browser` projects. ESLint + Prettier from Tiger's template, TS-focused (no React). `bun install`, `bun run typecheck`, `bun run test` all green against empty files.

**Acceptance:** empty package compiles, typechecks, tests run (zero tests is fine).

---

### Batch 1: Core plumbing (no audio yet)

Pure helpers only. All unit-testable in Node. No Web Audio import.

Files:

- `src/rng.ts` — `createRng(seed?: number): () => number`. Mulberry32. Deterministic when seeded. `Math.random` when not. Also export a helper `createJitter({ seed?, variation })` that returns `(baseline: number, range: number) => number` producing `baseline + (rng() * 2 - 1) * range * variation`. When `variation === 0`, it shortcircuits to return `baseline` without touching the rng (so canonical output is identical regardless of seed).
- `src/utils.ts` — `dbToGain`, `gainToDb`, `msToSamples`, `samplesToMs`, `semitonesToRatio`, `clamp`.
- `src/types.ts` — shared option shapes (none of the public API lives here, just internal types if they emerge).
- `src/codecs/wav.ts` — `encodeWav({ channels, sampleRate }): Uint8Array`. 16-bit PCM. Hand-rolled, no deps. Reusable escape hatch.

Tests (unit):

- `rng.test.ts` — same seed → same sequence. Different seeds diverge. Values in `[0, 1)`.
- `utils.test.ts` — round-trips (`dbToGain(gainToDb(x)) ≈ x`), known values (`dbToGain(0) === 1`, `dbToGain(-6) ≈ 0.501`).
- `wav.test.ts` — encodes 1 second of silence mono/stereo, asserts RIFF header bytes, sample count, sample rate bytes.

**Acceptance:** unit tests green. No browser tests yet.

---

### Batch 2: `Sfx` class skeleton + context

Now we touch Web Audio, so we're in browser-test land.

Files:

- `src/context.ts` — `getSharedContext(): AudioContext`, `createOfflineContext({ durationMs, sampleRate, channels }): OfflineAudioContext`, `configure({ context?, defaultSampleRate? })`.
- `src/Sfx.ts` — class with private `buffer`, public getters (`duration`, `sampleRate`, `channels`, `buffer`). Private constructor. Static `fromBuffer({ buffer })` factory that wraps an existing `AudioBuffer`.

Tests (browser):

- `Sfx.fromBuffer.browser.test.ts` — construct from an offline-rendered silent buffer. Getters return expected numbers. Class is immutable (no public mutators).
- `context.browser.test.ts` — `getSharedContext` returns the same instance across calls. `configure({ context })` swaps the shared one. `createOfflineContext` honors duration and sample rate.

**Acceptance:** can construct a `Sfx` from a hand-built buffer and read its properties. No transforms, no factories yet.

---

### Batch 3: Loading + silence

Finish the "I already have a buffer" and "give me nothing" entry points.

Files:

- `src/factories/loading.ts` — `fromBuffer`, `fromChannels`, `silence`.

`fromChannels` is the neiro bridge. It takes `{ channels: Float32Array[], sampleRate? }`, creates an `AudioBuffer` on the shared context, copies samples in, wraps in `Sfx`.

`silence` renders a zero-filled buffer of the given duration/channels/sampleRate.

Tests (browser):

- `loading.browser.test.ts`
  - `fromBuffer` wraps without copying (same underlying buffer).
  - `fromChannels` round-trips: pass in known samples, read them back via `toChannels` (stub this until Batch 9, or assert via `buffer.getChannelData`).
  - `silence` produces all-zero samples of the correct length.

**Acceptance:** all three loading paths work. Browser tests green.

---

### Batch 4: Primitives

Raw waveforms. Everything from here down uses `OfflineAudioContext` + `OscillatorNode` (or a custom `AudioBufferSourceNode` for noise) and renders to an `AudioBuffer`.

Files:

- `src/factories/primitives.ts` — `sine`, `square`, `saw`, `triangle`, `noise`.

Noise is hand-generated (seeded RNG → Float32Array → wrap in AudioBuffer → feed through `AudioBufferSourceNode`). Pink noise via Paul Kellet's filter. Brown noise via running integration + DC removal.

Tests (browser):

- `primitives.browser.test.ts`
  - Each oscillator renders a buffer of the requested duration.
  - Peak-to-peak amplitude sits in `[-1, 1]`.
  - `sine` crosses zero the expected number of times for its frequency.
  - Noise with the same seed is byte-identical across calls (pass seed → diff two invocations).
  - Noise with no seed differs across calls (statistical check, not strict inequality).

**Acceptance:** programmatic tests green. Once the playground is wired up (next), click through each primitive, confirm by ear.

---

### Batch 5: Shared-with-neiro transforms

The "plain" transforms. Most are direct buffer ops with no filter graph. A couple need a render pass.

Files:

- `src/transforms/gain.ts` — multiply by linear gain.
- `src/transforms/fade.ts` — `fadeIn`, `fadeOut`. Linear ramp via `GainNode.gain.linearRampToValueAtTime` in offline context, or direct buffer multiply (simpler). Pick direct multiply — fewer moving parts.
- `src/transforms/reverse.ts` — reverse each channel in-place on a copy.
- `src/transforms/slice.ts` — copy a sub-range of samples.
- `src/transforms/concat.ts` — allocate a new buffer, copy A then B. Throws on sample-rate or channel mismatch.
- `src/transforms/mix.ts` — overlay. Longest wins, shorter padded with silence. Throws on mismatch.
- `src/transforms/resample.ts` — render through `OfflineAudioContext` at the new sample rate via `AudioBufferSourceNode`.
- `src/transforms/channels.ts` — `toMono` (average), `toStereo` (mono→dup, 2ch→passthrough, >2ch→downmix-then-dup).
- `src/transforms/speed.ts` — `playbackRate` trick; changes duration, no pitch preservation.

Wire all of these as instance methods on `Sfx`.

Tests (browser):

- `transforms.shared.browser.test.ts`
  - `gain({ db: -6 })` halves the RMS (roughly).
  - `fadeIn` sample at t=0 is ~0, at t=ms ~= peak.
  - `reverse(reverse(x)) === x` (sample-wise).
  - `slice({ startMs, endMs })` length matches.
  - `concat` duration sums.
  - `mix` duration equals max.
  - `resample({ sampleRate: 24000 })` from 48k halves sample count.
  - `toMono` reduces channels to 1. `toStereo` produces 2.
  - Strict errors thrown for mismatched concat/mix.

**Acceptance:** programmatic tests green. Playground: beep → pause → reverse-beep by chaining concat calls.

---

### Batch 6: Generation-specific transforms

The real Web Audio muscle. Each one builds a graph inside an `OfflineAudioContext` and renders.

Files:

- `src/transforms/envelope.ts` — ADSR. `GainNode` with `setValueAtTime` + `linearRampToValueAtTime` automation.
- `src/transforms/filters.ts` — `lowpass`, `highpass`, `bandpass`. `BiquadFilterNode`, type swap per method.
- `src/transforms/pitch.ts` — `AudioBufferSourceNode.playbackRate` = `semitonesToRatio(n)`. Changes duration.
- `src/transforms/delay.ts` — `DelayNode` + feedback via `GainNode` loop. Wet/dry via parallel `GainNode`s.
- `src/transforms/reverb.ts` — generate impulse response (exponentially-decaying noise of `durationMs`), load into `ConvolverNode`. Wet/dry mix.
- `src/transforms/distortion.ts` — `WaveShaperNode` with a symmetric curve derived from `amount`.

Tests (browser):

- `envelope.browser.test.ts` — buffer at t=0 is 0, peak after attack, sustain value holds, ends at 0.
- `filters.browser.test.ts` — feed a 10kHz sine into `lowpass({ cutoff: 1000 })`, expect RMS drop. Inverse for highpass.
- `pitch.browser.test.ts` — `+12 semitones` halves duration and doubles frequency content (measure via zero-crossings).
- `delay.browser.test.ts` — dirac impulse input → multiple decaying copies at expected tap times.
- `reverb.browser.test.ts` — dry signal + reverb is longer than dry signal alone. Tail is quieter than head.
- `distortion.browser.test.ts` — amount > 0 introduces harmonics (RMS increases or spectral content spreads).

**Acceptance:** programmatic tests green. Playground: the spec's hand-built laser chain (`Sfx.sine(...).pitch(...).envelope(...).lowpass(...)`) should actually sound like a laser.

---

### Batch 7: Composition (static factories)

`Sfx.mix({ others })` and `Sfx.concat({ others })`. Array-based variants that fold over the instance methods.

Files:

- `src/factories/composition.ts`

Tests (browser):

- `composition.browser.test.ts`
  - `Sfx.concat({ others: [a, b, c] })` equals `a.concat({ other: b }).concat({ other: c })`.
  - `Sfx.mix({ others: [a, b] })` duration equals `max(a, b)`.
  - Mismatches throw.

**Acceptance:** the explosion example from the spec runs.

---

### Batch 8: Game helpers (with variation)

One file per helper. Each is a hand-tuned composition of primitives + transforms from earlier batches, plus the shared variation model.

#### The variation model

Every helper accepts two related options:

- `seed?: number` — undefined means pick a fresh random seed per call, a number means deterministic.
- `variation?: number` — `0` to `1`, defaults to `0.5`. `0` disables variation entirely (canonical baseline). `1` maxes it out.

Behavior grid:

| seed      | variation | result                                                            |
| --------- | --------- | ----------------------------------------------------------------- |
| undefined | 0         | Canonical baseline. Identical every call.                         |
| undefined | >0        | Family of sounds. Each call slightly different. Modern game feel. |
| number    | 0         | Canonical baseline. Identical every call.                         |
| number    | >0        | Varies, but reproducible given the same seed.                     |

**How it's implemented:** the helper builds a deterministic RNG from the effective seed. Every internal knob that jitters (noise seed, tiny pitch offset, envelope attack wiggle, gain nudge) calls `rng()` once and maps the `[0, 1)` output to a small delta scaled by `variation`. If `variation === 0`, the helper skips the jitter path entirely and uses baseline numbers. This keeps the canonical sound byte-identical regardless of RNG state.

Document this once in `src/factories/helpers/_variation.ts` as a tiny helper:

```ts
// Returns a jitter function: jitter(baseline, range) = baseline + (-range..range) * variation
function createJitter({ seed, variation }: { seed?: number; variation: number })
```

Every helper uses it. Keeps variation logic consistent across the suite and trivial to tune per-helper (each helper picks its own ranges).

#### Helpers to implement

Files under `src/factories/helpers/`:

- `_variation.ts` — shared `createJitter` + types.
- `gunshot.ts` — short noise burst, lowpass tail, envelope, optional silencer lowpass.
- `explosion.ts` — pink noise + low sine, heavy envelope, reverb scaled by `size`.
- `coinPickup.ts` — two stacked sines a fifth apart, bright short envelope.
- `laserShot.ts` — sine + pitch sweep via `speed` or pitch-over-time (we may need a helper for this).
- `jump.ts` — pitched sine with a short upward sweep.
- `hit.ts` — material-flavored noise burst (metal = bright + ring, flesh = dull thud).
- `footstep.ts` — surface-flavored noise with envelope shape.
- `powerUp.ts` — ascending arpeggio of sines concatenated with short gaps.

Each helper's option type extends the shared `{ seed?: number; variation?: number }`.

Tests (browser):

- `helpers.browser.test.ts`
  - Each helper returns a non-silent `Sfx`.
  - `variation: 0` produces byte-identical output across calls, with or without a seed.
  - Same `seed` + same `variation > 0` produces byte-identical output across calls.
  - No seed + `variation > 0` produces different output across calls (statistical check).
  - Duration sits in a sensible range (e.g., gunshot ~ 100–300ms unless `tailMs` is set).
  - No helper throws with defaults.

**Listen pass:** playground. Grid of every helper, with controls for `variation`, optional `seed`, and the helper's own options. A "fire 8 takes" button pipes through the pooling pattern so you can hear a burst of variations back-to-back. Sibling siblings, not strangers.

Optional `SFXLIB_DUMP=1 bun run test:browser` regression reference: dumps `<name>-baseline.wav`, `<name>-seeded.wav`, `<name>-varied-N.wav`. Checked in only if we want a set of reference sounds; otherwise gitignored.

**Acceptance:** the one-liner examples from the spec produce audible, game-appropriate sounds. The pooling pattern from the spec works end-to-end:

```ts
const pool = Array.from({ length: 8 }, (_, i) =>
  Sfx.gunshot({ caliber: 'heavy', seed: i })
)
```

---

### Batch 9: Playback + export

Polish step. Everything that takes audio out of the library.

Files:

- `src/playback.ts` — `play({ loop?, when? })` and `stop()` on `Sfx`. Resume suspended context. Track active sources so `stop()` can kill them.
- Extend `Sfx.ts` with `toChannels()`, `toWav()`, `toBlob({ format })`, `toUrl({ format })`.

Tests:

- `playback.browser.test.ts` — `play()` resolves after `duration`. `loop: true` + `stop()` cuts it short. `when` delays start.
- `export.browser.test.ts` — `toChannels()` round-trips with `fromChannels`. `toWav()` produces a valid RIFF (re-parse with our own decoder stub or assert header bytes). `toBlob().type === 'audio/wav'`. `toUrl()` is a `blob:` URL.

**Acceptance:** the entire spec's Example Usage section runs end-to-end in a browser.

---

### Playground (parallel track, start after Batch 4)

Not a batch. Scaffolded up front at `/packages/playground`. Stays empty until we have sounds to audition.

Wire it up as soon as Batch 4 (primitives) lands. Vite app, imports `@tigerabrodioss/sfxlib` via `workspace:*`. Grow it alongside the library:

- After Batch 4: a button per primitive, an input for freq and duration, a play button.
- After Batch 5: chain-builder UI (gain, fades, slice, reverse, concat, mix).
- After Batch 6: sliders for filter cutoff/q, reverb wet, delay time/feedback, distortion amount. Waveform preview via canvas.
- After Batch 8: grid of every helper, variation/seed controls, "play 8 takes" rapid-fire button for pooling, download-as-WAV per sound.

This is where listen-testing lives. Keeping it in the repo (workspace:\* link, no publish step) means edits to `/packages/sfx` rebuild the playground instantly.

---

## Ordering notes

- Batch 1 blocks everything. RNG and WAV encoder are load-bearing.
- Batch 2 unlocks every browser test because it's the first thing that touches `AudioContext`.
- Batches 4 and 5 can technically be parallel (primitives don't depend on shared transforms), but the shared transforms are more useful once there are primitives to feed them.
- Batch 6 unlocks Batch 8 (helpers need filters, envelopes, reverb).
- Batches 7 and 9 can slot in wherever once their deps exist.

---

## What "done" looks like for each batch

1. All unit tests pass (`bun run test:unit`).
2. All browser tests pass (`bun run test:browser`).
3. `bun run tsc` and `bun run lint` clean.
4. If new factories or transforms shipped, Tiger clicked through them in the playground and accepted the sound.

Don't move to the next batch until all four are green.

---

## Anti-patterns to avoid

- **Reimplementing DSP.** `BiquadFilterNode` is already an IIR filter. `ConvolverNode` already convolves. No hand-rolled filter coefficients unless Web Audio literally can't do the thing (it can).
- **Caching `OfflineAudioContext`.** Create fresh per render. They're cheap.
- **Sharing `AudioBuffer` across ownership boundaries.** Every transform returns a new buffer. Never mutate `.buffer` in place.
- **Promise-heavy factories.** Every factory is synchronous. Rendering through `OfflineAudioContext.startRendering()` is the one await, and we wrap the whole thing so the user sees a plain `Sfx`.
  - Note: `startRendering()` returns a promise, so factories that render are actually async internally. The spec says they're synchronous. Resolve this during Batch 2 — either make factories async or precompute buffers lazily on first access. Flag this for discussion before Batch 4.
- **Eager shared context.** Don't create `AudioContext` on import. Browsers require a user gesture. Lazy-create on first `play()`.
- **Testing the sound, not the shape.** Tests assert properties (duration, RMS, zero-crossings). The ear test is the listen dump.

---

## Daily rhythm

1. Pick the next batch.
2. Read the batch's files list and test list.
3. Write failing tests first (unit if pure, browser if Web Audio).
4. Run them, confirm red.
5. Implement until green.
6. If it's a listen-test batch, `SFXLIB_DUMP=1 bun run test:browser`, listen, adjust, repeat.
7. Typecheck, lint, commit.
8. Move to the next batch.
