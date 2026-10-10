import { describe, expect, it } from 'vitest'
import type { DecisionVariant } from '~/types/decision-table'
import { copyVariant, removeVariant } from '~/utils/tableVariants'

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
  it('reporte la probabilité retirée sur la première variante restante', () => {
    const result = removeVariant([variant('a', 50), variant('b', 30), variant('c', 20)], 'b')
    expect(result.map(v => [v._id, v.probability])).toEqual([['a', 80], ['c', 20]])
  })

  it('reporte sur la suivante quand on retire la première', () => {
    const result = removeVariant([variant('a', 50), variant('b', 50)], 'a')
    expect(result.map(v => [v._id, v.probability])).toEqual([['b', 100]])
  })

  it('garde la dernière variante et ignore un id inconnu', () => {
    const one = [variant('a', 100)]
    expect(removeVariant(one, 'a')).toBe(one)
    const two = [variant('a', 50), variant('b', 50)]
    expect(removeVariant(two, 'z')).toBe(two)
  })
})
