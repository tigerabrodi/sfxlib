import { Sfx } from '../Sfx'

interface CompositionOptions {
  readonly others: Array<Sfx>
}

export const concat = ({ others }: CompositionOptions): Sfx =>
  Sfx.concat({ others })

export const mix = ({ others }: CompositionOptions): Sfx => Sfx.mix({ others })
