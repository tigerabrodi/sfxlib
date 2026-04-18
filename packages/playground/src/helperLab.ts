import { Sfx } from '../../sfx/src/index'

type HelperName =
  | 'coinPickup'
  | 'explosion'
  | 'footstep'
  | 'gunshot'
  | 'hit'
  | 'jump'
  | 'laserShot'
  | 'powerUp'

interface SharedHelperState {
  readonly seed?: number
  readonly variation: number
}

type HelperValue = boolean | number | string
type HelperValues = Record<string, HelperValue>

interface HelperControlBase {
  readonly label: string
  readonly name: string
}

interface HelperSelectControl extends HelperControlBase {
  readonly kind: 'select'
  readonly options: ReadonlyArray<string>
  readonly value: string
}

interface HelperNumberControl extends HelperControlBase {
  readonly kind: 'number'
  readonly max?: number
  readonly min?: number
  readonly step?: number
  readonly value: number
}

interface HelperCheckboxControl extends HelperControlBase {
  readonly kind: 'checkbox'
  readonly checked: boolean
}

type HelperControl =
  | HelperCheckboxControl
  | HelperNumberControl
  | HelperSelectControl

interface HelperConfig {
  readonly controls: ReadonlyArray<HelperControl>
  readonly create: (values: HelperValues, shared: SharedHelperState) => Sfx
  readonly description: string
  readonly key: HelperName
  readonly label: string
}

interface MountHelperLabOptions {
  readonly container: HTMLDivElement
  readonly playSfx: (sfx: Sfx) => Promise<void>
  readonly readOptionalNumber: (input: HTMLInputElement) => number | undefined
  readonly readRequiredNumber: (input: HTMLInputElement) => number
  readonly seedInput: HTMLInputElement
  readonly status: HTMLParagraphElement
  readonly variationInput: HTMLInputElement
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

const renderHelperControl = (
  helperKey: HelperName,
  control: HelperControl
): string => {
  const inputId = `${helperKey}-${control.name}`

  if (control.kind === 'checkbox') {
    return `
      <div class="control">
        <label for="${inputId}">${control.label}</label>
        <input
          id="${inputId}"
          name="${control.name}"
          type="checkbox"
          data-helper-input="true"
          ${control.checked ? 'checked' : ''}
        />
      </div>
    `
  }

  if (control.kind === 'number') {
    return `
      <div class="control">
        <label for="${inputId}">${control.label}</label>
        <input
          id="${inputId}"
          name="${control.name}"
          type="number"
          data-helper-input="true"
          value="${control.value}"
          ${control.min === undefined ? '' : `min="${control.min}"`}
          ${control.max === undefined ? '' : `max="${control.max}"`}
          ${control.step === undefined ? '' : `step="${control.step}"`}
        />
      </div>
    `
  }

  return `
    <div class="control">
      <label for="${inputId}">${control.label}</label>
      <select id="${inputId}" name="${control.name}" data-helper-input="true">
        ${control.options
          .map(
            (option) =>
              `<option value="${option}" ${option === control.value ? 'selected' : ''}>${option}</option>`
          )
          .join('')}
      </select>
    </div>
  `
}

const helperConfigs: Array<HelperConfig> = [
  {
    key: 'gunshot',
    label: 'Gunshot',
    description: 'Snap plus body. Good for hearing suppression and tail shape.',
    controls: [
      {
        kind: 'select',
        label: 'Caliber',
        name: 'caliber',
        options: ['light', 'medium', 'heavy'],
        value: 'heavy',
      },
      {
        checked: false,
        kind: 'checkbox',
        label: 'Suppressed',
        name: 'suppressed',
      },
      {
        kind: 'number',
        label: 'Tail ms',
        name: 'tailMs',
        step: 5,
        value: 180,
      },
    ],
    create: (values, shared) =>
      Sfx.gunshot({
        caliber: values.caliber as 'light' | 'medium' | 'heavy',
        suppressed: values.suppressed as boolean,
        tailMs: values.tailMs as number,
        ...shared,
      }),
  },
  {
    key: 'explosion',
    label: 'Explosion',
    description: 'Noise blast plus rumble. Distance makes it duller.',
    controls: [
      {
        kind: 'select',
        label: 'Size',
        name: 'size',
        options: ['small', 'medium', 'large'],
        value: 'medium',
      },
      {
        kind: 'number',
        label: 'Distance',
        max: 1,
        min: 0,
        name: 'distance',
        step: 0.1,
        value: 0,
      },
    ],
    create: (values, shared) =>
      Sfx.explosion({
        distance: values.distance as number,
        size: values.size as 'small' | 'medium' | 'large',
        ...shared,
      }),
  },
  {
    key: 'coinPickup',
    label: 'Coin pickup',
    description: 'A bright two note arcade ping.',
    controls: [
      {
        kind: 'number',
        label: 'Pitch',
        max: 2,
        min: 0.5,
        name: 'pitch',
        step: 0.1,
        value: 1,
      },
      {
        kind: 'number',
        label: 'Brightness',
        max: 1,
        min: 0,
        name: 'brightness',
        step: 0.1,
        value: 0.8,
      },
    ],
    create: (values, shared) =>
      Sfx.coinPickup({
        brightness: values.brightness as number,
        pitch: values.pitch as number,
        ...shared,
      }),
  },
  {
    key: 'laserShot',
    label: 'Laser shot',
    description: 'Segmented sci fi chirp with sweep direction control.',
    controls: [
      {
        kind: 'number',
        label: 'Pitch',
        max: 2,
        min: 0.5,
        name: 'pitch',
        step: 0.1,
        value: 1,
      },
      {
        kind: 'select',
        label: 'Sweep',
        name: 'sweep',
        options: ['down', 'up', 'none'],
        value: 'down',
      },
    ],
    create: (values, shared) =>
      Sfx.laserShot({
        pitch: values.pitch as number,
        sweep: values.sweep as 'down' | 'none' | 'up',
        ...shared,
      }),
  },
  {
    key: 'jump',
    label: 'Jump',
    description: 'Short upward chirp that changes weight by character.',
    controls: [
      {
        kind: 'select',
        label: 'Character',
        name: 'character',
        options: ['light', 'medium', 'heavy'],
        value: 'medium',
      },
    ],
    create: (values, shared) =>
      Sfx.jump({
        character: values.character as 'light' | 'medium' | 'heavy',
        ...shared,
      }),
  },
  {
    key: 'hit',
    label: 'Hit',
    description: 'Material flavored impact with soft or hard attack.',
    controls: [
      {
        kind: 'select',
        label: 'Material',
        name: 'material',
        options: ['flesh', 'wood', 'metal', 'stone'],
        value: 'stone',
      },
      {
        kind: 'select',
        label: 'Impact',
        name: 'impact',
        options: ['soft', 'hard'],
        value: 'hard',
      },
    ],
    create: (values, shared) =>
      Sfx.hit({
        impact: values.impact as 'hard' | 'soft',
        material: values.material as 'flesh' | 'metal' | 'stone' | 'wood',
        ...shared,
      }),
  },
  {
    key: 'footstep',
    label: 'Footstep',
    description: 'Heel and toe pulse. Surface changes the texture.',
    controls: [
      {
        kind: 'select',
        label: 'Surface',
        name: 'surface',
        options: ['grass', 'wood', 'stone', 'metal', 'water'],
        value: 'stone',
      },
    ],
    create: (values, shared) =>
      Sfx.footstep({
        surface: values.surface as
          | 'grass'
          | 'metal'
          | 'stone'
          | 'water'
          | 'wood',
        ...shared,
      }),
  },
  {
    key: 'powerUp',
    label: 'Power up',
    description: 'Ascending reward arpeggio with different flavors.',
    controls: [
      {
        kind: 'select',
        label: 'Style',
        name: 'style',
        options: ['arcade', 'modern', 'magical'],
        value: 'arcade',
      },
    ],
    create: (values, shared) =>
      Sfx.powerUp({
        style: values.style as 'arcade' | 'magical' | 'modern',
        ...shared,
      }),
  },
]

const readSharedHelperState = ({
  readOptionalNumber,
  readRequiredNumber,
  seedInput,
  variationInput,
}: Pick<
  MountHelperLabOptions,
  'readOptionalNumber' | 'readRequiredNumber' | 'seedInput' | 'variationInput'
>): SharedHelperState => {
  const seed = readOptionalNumber(seedInput)

  return {
    variation: clamp(readRequiredNumber(variationInput), 0, 1),
    ...(seed === undefined ? {} : { seed }),
  }
}

const readHelperValues = (
  helperKey: HelperName,
  readRequiredNumber: (input: HTMLInputElement) => number
): HelperValues => {
  const card = document.querySelector<HTMLElement>(
    `[data-helper-card="${helperKey}"]`
  )

  if (card === null) {
    throw new Error(`Missing helper card for ${helperKey}`)
  }

  const fields = Array.from(
    card.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      '[data-helper-input="true"]'
    )
  )
  const values: HelperValues = {}

  for (const field of fields) {
    if (field instanceof HTMLInputElement && field.type === 'checkbox') {
      values[field.name] = field.checked
      continue
    }

    if (field instanceof HTMLInputElement && field.type === 'number') {
      values[field.name] = readRequiredNumber(field)
      continue
    }

    values[field.name] = field.value
  }

  return values
}

const getHelperConfig = (helperKey: HelperName): HelperConfig => {
  const config = helperConfigs.find((entry) => entry.key === helperKey)

  if (config === undefined) {
    throw new Error(`Unknown helper ${helperKey}`)
  }

  return config
}

const createHelperBurst = (
  config: HelperConfig,
  values: HelperValues,
  shared: SharedHelperState
): Sfx => {
  const spacing = Sfx.silence({
    durationMs: 80,
    channels: 1,
  })
  const sequence: Array<Sfx> = []

  for (let index = 0; index < 8; index += 1) {
    sequence.push(
      config.create(values, {
        variation: shared.variation,
        ...(shared.seed === undefined ? {} : { seed: shared.seed + index }),
      })
    )

    if (index < 7) {
      sequence.push(spacing)
    }
  }

  return Sfx.concat({ others: sequence })
}

export const mountHelperLab = ({
  container,
  playSfx,
  readOptionalNumber,
  readRequiredNumber,
  seedInput,
  status,
  variationInput,
}: MountHelperLabOptions): void => {
  container.innerHTML = helperConfigs
    .map(
      (config) => `
        <article class="helper-card" data-helper-card="${config.key}">
          <div>
            <h3>${config.label}</h3>
            <p>${config.description}</p>
          </div>
          <div class="control-grid">
            ${config.controls
              .map((control) => renderHelperControl(config.key, control))
              .join('')}
          </div>
          <div class="helper-actions">
            <button class="helper-button" data-action="play" data-helper="${config.key}">
              Play ${config.label}
            </button>
            <button class="helper-button" data-action="burst" data-helper="${config.key}">
              Fire 8 takes
            </button>
          </div>
        </article>
      `
    )
    .join('')

  const helperButtons = Array.from(
    container.querySelectorAll<HTMLButtonElement>('[data-helper]')
  )

  for (const button of helperButtons) {
    button.addEventListener('click', async () => {
      const helperKey = button.dataset.helper as HelperName | undefined
      const action = button.dataset.action

      if (helperKey === undefined || action === undefined) {
        return
      }

      try {
        const config = getHelperConfig(helperKey)
        const values = readHelperValues(helperKey, readRequiredNumber)
        const shared = readSharedHelperState({
          readOptionalNumber,
          readRequiredNumber,
          seedInput,
          variationInput,
        })

        status.textContent =
          action === 'burst'
            ? `Rendering 8 ${config.label.toLowerCase()} takes.`
            : `Rendering ${config.label.toLowerCase()}.`

        await playSfx(
          action === 'burst'
            ? createHelperBurst(config, values, shared)
            : config.create(values, shared)
        )

        status.textContent =
          action === 'burst'
            ? `Played 8 ${config.label.toLowerCase()} takes.`
            : `Played ${config.label.toLowerCase()}.`
      } catch (error) {
        status.textContent =
          error instanceof Error ? error.message : 'Something went wrong.'
      }
    })
  }
}
