# Design decisions

Decisions that refine or override [SPEC.md](./SPEC.md). Made deliberately so we stop rehashing them.

---

## 1. Async vs sync factories

**Problem:** the spec says factories are synchronous and return a fully-rendered `Sfx`. But `OfflineAudioContext.startRendering()` is async. You can't synchronously produce a rendered buffer from a graph.

**Options considered:**

| Option                                                                 | Pro                                                       | Con                                                                                                   |
| ---------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| A. Make every factory/transform `Promise<Sfx>`                         | Honest about async                                        | Chaining becomes `await sfx.pitch().then(s => s.gain())`. Ugly. Kills the one-liner feel.             |
| B. Hand-roll the DSP that blocks sync returns (filters, reverb, delay) | Keeps full sync API                                       | Violates spec principle #6 ("Native DSP"). Re-introduces the thing neiro already tried to avoid.      |
| C. Mix: primitives sync (hand-fill), graph-using transforms async      | Some things stay sync                                     | Inconsistent API. Users can't predict which call will be async.                                       |
| **D. Sfx wraps `Promise<AudioBuffer>` internally. Chaining is sync.**  | **Chaining feels sync. Only terminal ops expose async.**  | **`.buffer` and `to*()` become async. Spec's sync export signatures shift to return Promises.**      |

**Decision: Option D.**

### What this means concretely

`Sfx` stores `Promise<AudioBuffer>` internally, not `AudioBuffer`. Factories and transforms return a new `Sfx` synchronously. The Promise chains op-by-op in the background.

Cheap metadata (duration, sample rate, channels) is computed eagerly from options at construction time, without waiting for the buffer. Those stay synchronous properties.

Anything that needs the actual samples becomes async:

```ts
// Sync (from spec) → stays sync
sfx.duration // seconds
sfx.sampleRate // Hz
sfx.channels // channel count

// Sync (from spec) → becomes async
sfx.getBuffer(): Promise<AudioBuffer>
sfx.toChannels(): Promise<{ channels: Float32Array[]; sampleRate: number }>
sfx.toWav(): Promise<Uint8Array>
sfx.toBlob({ format?: "wav" }): Promise<Blob>
sfx.toUrl({ format?: "wav" }): Promise<string>

// Already async in spec → unchanged
sfx.play(): Promise<void>
sfx.stop(): void
```

`buffer` as a property getter can't return a Promise cleanly (awaiting a getter is unnatural), so it's renamed to `getBuffer()`.

### Why the cost is low

The one-liner stays one-liner: `Sfx.gunshot().play()`. `play()` was already async per the spec, so the user's top-level `await` or fire-and-forget pattern doesn't change.

The chain stays a chain: `Sfx.sine(...).pitch(...).envelope(...).lowpass(...).play()`. No awaits between transforms.

The only code shape that changes is the "grab bytes" path: `await sfx.toWav()` instead of `sfx.toWav()`. Acceptable.

### Spec override

`SPEC.md` still reads as sync. Treat this doc as the authority on return types. When we write the code, the types here win.

---

## 2. `configure({ context })` semantics

**Problem:** if the user swaps the shared `AudioContext` after some `Sfx` instances already exist, what happens?

**Key insight:** rendering happens on `OfflineAudioContext` per call. The shared `AudioContext` is only used for **playback** (the `BufferSource` that feeds the speakers). And `AudioBuffer` is portable across contexts per the Web Audio spec — you can create a buffer on one context and play it on another.

**Decision:** `configure({ context })` is callable at any time. It swaps the shared playback context. Existing `Sfx` instances keep their rendered buffers and play through the new context on the next `play()`. No re-parenting, no invalidation.

Document: "Call `configure` once at app startup if you have your own `AudioContext`. Calling it later works — old sounds will play through the new context — but there's no reason to do this in practice."

The `defaultSampleRate` option applies to subsequently-created `OfflineAudioContext`s. Doesn't retroactively change existing Sfxs.

---

## 3. `stop()` scope for concurrent playback

**Problem:**

```ts
const boom = Sfx.explosion({ size: 'large' })
boom.play() // playback A
boom.play() // playback B (while A still active)
boom.stop() // kills what?
```

**Options considered:**

- Stop all active playbacks of this `Sfx`. One `stop()` per `Sfx`.
- Stop only the most recent. Surprising.
- Return a handle from `play()` that has its own `stop()`. Most flexible but breaks the one-liner `.play()`.

**Decision:** `sfx.stop()` kills every active playback of that Sfx instance.

Why: matches game use cases (UI tear-down, scene change, mute) and keeps the API one-method-per-purpose. If someone needs per-invocation control later, we can add an optional handle return from `play()` in a non-breaking way (`play()` still returns `Promise<void>`, but we introduce `playHandle()` alongside).

---

## Living document

If any of these bite us during implementation, we revisit, update this doc, note the date, and keep going. Don't silently reverse a decision in code.
