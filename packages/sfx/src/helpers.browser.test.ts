import { describe, expect, it } from 'vitest'

import { Sfx } from './Sfx'

type HelperCase = {
  readonly create: (options?: { seed?: number; variation?: number }) => Sfx
  readonly maxDuration: number
  readonly minDuration: number
  readonly name: string
}

const helpers: Array<HelperCase> = [
  {
    name: 'gunshot',
    create: (options) => Sfx.gunshot(options),
    minDuration: 0.08,
    maxDuration: 0.5,
  },
  {
    name: 'explosion',
    create: (options) => Sfx.explosion(options),
    minDuration: 0.4,
    maxDuration: 3.5,
  },
  {
    name: 'coinPickup',
    create: (options) => Sfx.coinPickup(options),
    minDuration: 0.05,
    maxDuration: 0.5,
  },
  {
    name: 'laserShot',
    create: (options) => Sfx.laserShot(options),
    minDuration: 0.05,
    maxDuration: 0.6,
  },
  {
    name: 'jump',
    create: (options) => Sfx.jump(options),
    minDuration: 0.05,
    maxDuration: 0.6,
  },
  {
    name: 'hit',
    create: (options) => Sfx.hit(options),
    minDuration: 0.05,
    maxDuration: 0.6,
  },
  {
    name: 'footstep',
    create: (options) => Sfx.footstep(options),
    minDuration: 0.05,
    maxDuration: 0.6,
  },
  {
    name: 'powerUp',
    create: (options) => Sfx.powerUp(options),
    minDuration: 0.1,
    maxDuration: 1.5,
  },
] as const

const toBytes = async (sfx: Sfx): Promise<Array<number>> => {
  const buffer = await sfx.getBuffer()
  const channel = buffer.getChannelData(0)

  return Array.from(new Uint8Array(channel.slice().buffer))
}

const peak = async (sfx: Sfx): Promise<number> => {
  const buffer = await sfx.getBuffer()
  let max = 0

  for (
    let channelIndex = 0;
    channelIndex < buffer.numberOfChannels;
    channelIndex += 1
  ) {
    const channel = buffer.getChannelData(channelIndex)

    for (const sample of channel) {
      max = Math.max(max, Math.abs(sample))
    }
  }

  return max
}

describe('helper factories', () => {
  for (const helper of helpers) {
    it(`${helper.name} returns a non silent sfx with a sensible duration`, async () => {
      const sfx = helper.create()

      expect(sfx.duration).toBeGreaterThanOrEqual(helper.minDuration)
      expect(sfx.duration).toBeLessThanOrEqual(helper.maxDuration)
      expect(await peak(sfx)).toBeGreaterThan(0.01)
    })

    it(`${helper.name} with variation zero is canonical without a seed`, async () => {
      const first = helper.create({ variation: 0 })
      const second = helper.create({ variation: 0 })

      expect(await toBytes(first)).toEqual(await toBytes(second))
    })

    it(`${helper.name} with variation zero ignores the seed and stays canonical`, async () => {
      const first = helper.create({ seed: 1, variation: 0 })
      const second = helper.create({ seed: 999, variation: 0 })

      expect(await toBytes(first)).toEqual(await toBytes(second))
    })

    it(`${helper.name} is deterministic for the same seed and variation`, async () => {
      const first = helper.create({ seed: 42, variation: 0.6 })
      const second = helper.create({ seed: 42, variation: 0.6 })

      expect(await toBytes(first)).toEqual(await toBytes(second))
    })

    it(`${helper.name} varies when there is no seed and variation is on`, async () => {
      const first = helper.create({ variation: 0.6 })
      const second = helper.create({ variation: 0.6 })

      expect(await toBytes(first)).not.toEqual(await toBytes(second))
    })
  }
})
