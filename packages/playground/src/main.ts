import {
  getSharedContext,
  noise,
  saw,
  sine,
  square,
  triangle,
  Sfx,
  type NoiseType,
} from '../../sfx/src/index'

const app = document.querySelector<HTMLDivElement>('#app')

if (app === null) {
  throw new Error('Missing #app container')
}

const style = document.createElement('style')

style.textContent = `
  .playground-shell {
    display: grid;
    gap: 24px;
  }

  .playground-card {
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 20px;
    padding: 20px;
    background:
      linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.72));
    box-shadow: 0 22px 48px rgba(2, 6, 23, 0.35);
  }

  .playground-card h2 {
    margin: 0 0 8px;
    font-size: 18px;
  }

  .playground-card p {
    margin: 0;
    line-height: 1.5;
    color: rgba(226, 232, 240, 0.82);
  }

  .control-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-top: 20px;
  }

  .control {
    display: grid;
    gap: 8px;
  }

  .control label {
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.95);
  }

  .control input,
  .control select {
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 12px;
    padding: 12px 14px;
    background: rgba(15, 23, 42, 0.92);
    color: inherit;
    font: inherit;
  }

  .primitive-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin-top: 20px;
  }

  .primitive-button {
    border: 0;
    border-radius: 14px;
    padding: 16px 14px;
    background:
      linear-gradient(135deg, rgba(56, 189, 248, 0.95), rgba(14, 165, 233, 0.7));
    color: #020617;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition:
      transform 120ms ease,
      box-shadow 120ms ease,
      opacity 120ms ease;
    box-shadow: 0 16px 28px rgba(14, 165, 233, 0.2);
  }

  .primitive-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 30px rgba(14, 165, 233, 0.26);
  }

  .primitive-button:active {
    transform: translateY(0);
  }

  .primitive-button[data-primitive="noise"] {
    background:
      linear-gradient(135deg, rgba(251, 191, 36, 0.96), rgba(249, 115, 22, 0.78));
    box-shadow: 0 16px 28px rgba(249, 115, 22, 0.22);
  }

  .status {
    min-height: 24px;
    margin-top: 16px;
    color: rgba(186, 230, 253, 0.96);
  }
`

document.head.append(style)

app.insertAdjacentHTML(
  'beforeend',
  `
    <div class="playground-shell">
      <section class="playground-card">
        <h2>Primitive controls</h2>
        <p>Pick a few values. Then click a waveform button. Noise uses the noise controls instead of frequency.</p>
        <div class="control-grid">
          <div class="control">
            <label for="freq">Frequency in Hz</label>
            <input id="freq" type="number" min="20" step="1" value="440" />
          </div>
          <div class="control">
            <label for="duration">Duration in ms</label>
            <input id="duration" type="number" min="10" step="10" value="140" />
          </div>
          <div class="control">
            <label for="sample-rate">Sample rate</label>
            <input id="sample-rate" type="number" min="8000" step="1000" value="48000" />
          </div>
          <div class="control">
            <label for="noise-type">Noise type</label>
            <select id="noise-type">
              <option value="white">white</option>
              <option value="pink">pink</option>
              <option value="brown">brown</option>
            </select>
          </div>
          <div class="control">
            <label for="seed">Noise seed</label>
            <input id="seed" type="number" step="1" placeholder="blank = random" />
          </div>
        </div>
      </section>
      <section class="playground-card">
        <h2>Listen</h2>
        <p>Each button renders with the library first. Then it plays the rendered buffer through the shared audio context.</p>
        <div class="primitive-grid">
          <button class="primitive-button" data-primitive="sine">Play sine</button>
          <button class="primitive-button" data-primitive="square">Play square</button>
          <button class="primitive-button" data-primitive="saw">Play saw</button>
          <button class="primitive-button" data-primitive="triangle">Play triangle</button>
          <button class="primitive-button" data-primitive="noise">Play noise</button>
        </div>
        <div class="primitive-grid">
          <button class="primitive-button" id="play-sequence">Play beep pause reverse</button>
        </div>
        <p id="status" class="status">Ready.</p>
      </section>
    </div>
  `
)

const freqInput = document.querySelector<HTMLInputElement>('#freq')
const durationInput = document.querySelector<HTMLInputElement>('#duration')
const sampleRateInput = document.querySelector<HTMLInputElement>('#sample-rate')
const noiseTypeInput = document.querySelector<HTMLSelectElement>('#noise-type')
const seedInput = document.querySelector<HTMLInputElement>('#seed')
const sequenceButton =
  document.querySelector<HTMLButtonElement>('#play-sequence')
const status = document.querySelector<HTMLParagraphElement>('#status')
const buttons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-primitive]')
)

if (
  freqInput === null ||
  durationInput === null ||
  sampleRateInput === null ||
  noiseTypeInput === null ||
  seedInput === null ||
  sequenceButton === null ||
  status === null
) {
  throw new Error('Missing playground controls')
}

const readRequiredNumber = (input: HTMLInputElement): number => {
  const value = Number(input.value)

  if (Number.isNaN(value)) {
    throw new Error(`Invalid number in ${input.id}`)
  }

  return value
}

const readOptionalNumber = (input: HTMLInputElement): number | undefined => {
  const trimmed = input.value.trim()

  if (trimmed === '') {
    return undefined
  }

  const value = Number(trimmed)

  if (Number.isNaN(value)) {
    throw new Error(`Invalid number in ${input.id}`)
  }

  return value
}

const playSfx = async (sfx: Sfx): Promise<void> => {
  const context = getSharedContext()

  if (context.state === 'suspended') {
    await context.resume()
  }

  const source = context.createBufferSource()

  source.buffer = await sfx.getBuffer()
  source.connect(context.destination)
  source.start()
}

const createPrimitive = (primitive: string): Sfx => {
  const durationMs = readRequiredNumber(durationInput)
  const sampleRate = readRequiredNumber(sampleRateInput)

  if (primitive === 'noise') {
    const seed = readOptionalNumber(seedInput)

    return noise({
      durationMs,
      sampleRate,
      type: noiseTypeInput.value as NoiseType,
      ...(seed === undefined ? {} : { seed }),
    })
  }

  const freq = readRequiredNumber(freqInput)

  switch (primitive) {
    case 'sine':
      return sine({ freq, durationMs, sampleRate })
    case 'square':
      return square({ freq, durationMs, sampleRate })
    case 'saw':
      return saw({ freq, durationMs, sampleRate })
    case 'triangle':
      return triangle({ freq, durationMs, sampleRate })
    default:
      throw new Error(`Unknown primitive ${primitive}`)
  }
}

const createTransformSequence = (): Sfx => {
  const sampleRate = readRequiredNumber(sampleRateInput)
  const freq = readRequiredNumber(freqInput)
  const beep = sine({
    freq,
    durationMs: 120,
    sampleRate,
  }).fadeOut({ ms: 24 })
  const gap = Sfx.silence({
    durationMs: 100,
    sampleRate,
    channels: 1,
  })

  return beep.concat({ other: gap }).concat({ other: beep.reverse() })
}

for (const button of buttons) {
  button.addEventListener('click', async () => {
    const primitive = button.dataset.primitive

    if (primitive === undefined) {
      return
    }

    try {
      status.textContent = `Rendering ${primitive}.`

      const sfx = createPrimitive(primitive)

      await playSfx(sfx)

      status.textContent =
        primitive === 'noise'
          ? `Played ${primitive} with ${noiseTypeInput.value} mode.`
          : `Played ${primitive} at ${freqInput.value} Hz for ${durationInput.value} ms.`
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : 'Something went wrong.'
    }
  })
}

sequenceButton.addEventListener('click', async () => {
  try {
    status.textContent = 'Rendering transform sequence.'

    const sfx = createTransformSequence()

    await playSfx(sfx)

    status.textContent = 'Played beep. pause. reverse beep.'
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : 'Something went wrong.'
  }
})
