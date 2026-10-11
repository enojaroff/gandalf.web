import { describe, expect, it } from 'vitest'
import type { DecisionVariant } from '~/types/decision-table'
import { characterCount, copyVariant, removeVariant } from '~/utils/tableVariants'

const variant = (id: string, probability: number, extra: Partial<DecisionVariant> = {}): DecisionVariant => ({
  _id: id,
  title: `Variante ${id}`,
  description: 'desc',
  probability,
  default_decision: 'NON',
  rules: [
    {
      _id: `${id}-r1`,
      priority: 0,
      than: 'OUI',
      title: 'Règle 1',
      description: null,
      conditions: [{ _id: `${id}-c1`, field_key: 'age', condition: '$gte', value: 18 }],
    },
    {
      _id: `${id}-r2`,
      priority: 1,
      than: 'X',
      title: 'Supprimée',
      description: null,
      conditions: [],
      isDeleted: true,
    },
  ],
  ...extra,
})

describe('copyVariant', () => {
  it('reprend les règles et conditions sans leurs _id, sous le nom donné', () => {
    const copy = copyVariant(variant('a', 60), { title: 'Copie', description: '' })

    expect(copy).not.toHaveProperty('_id')
    expect(copy.title).toBe('Copie')
    expect(copy.description).toBe('')
    expect(copy.default_decision).toBe('NON')
    expect(copy.rules).toEqual([
      {
        priority: 0,
        than: 'OUI',
        title: 'Règle 1',
        description: null,
        conditions: [{ field_key: 'age', condition: '$gte', value: 18 }],
      },
    ])
  })

  it('part d\'une probabilité nulle pour garder la somme des variantes', () => {
    expect(copyVariant(variant('a', 60), { title: 'Copie', description: '' }).probability).toBe(0)
  })

  it('ne modifie pas la variante source', () => {
    const source = variant('a', 60)
    copyVariant(source, { title: 'Copie', description: '' })
    expect(source.rules[0]!._id).toBe('a-r1')
    expect(source.rules[0]!.conditions[0]!._id).toBe('a-c1')
  })
})

describe('removeVariant', () => {
  it('en mode percent, reporte la probabilité retirée sur la première variante restante', () => {
    const result = removeVariant([variant('a', 50), variant('b', 30), variant('c', 20)], 'b', 'percent')
    expect(result.map(v => [v._id, v.probability])).toEqual([['a', 80], ['c', 20]])
  })

  it('en mode percent, reporte sur la suivante quand on retire la première', () => {
    const result = removeVariant([variant('a', 50), variant('b', 50)], 'a', 'percent')
    expect(result.map(v => [v._id, v.probability])).toEqual([['b', 100]])
  })

  it('hors mode percent, ne reporte rien : une probabilité reste entre 0 et 100', () => {
    for (const mode of ['random', 'first', undefined, null]) {
      const result = removeVariant([variant('a', 60), variant('b', 60)], 'b', mode)
      expect(result.map(v => [v._id, v.probability])).toEqual([['a', 60]])
    }
  })

  it('garde la dernière variante et ignore un id inconnu', () => {
    const one = [variant('a', 100)]
    expect(removeVariant(one, 'a', 'percent')).toBe(one)
    const two = [variant('a', 50), variant('b', 50)]
    expect(removeVariant(two, 'z', 'percent')).toBe(two)
  })
})

describe('characterCount', () => {
  it('compte les points de code, comme mb_strlen côté API', () => {
    expect(characterCount('Standard')).toBe(8)
    expect(characterCount('😀')).toBe(1)
    expect('😀'.length).toBe(2)
    expect(characterCount('😀'.repeat(70))).toBe(70)
    expect(characterCount('')).toBe(0)
  })
})
