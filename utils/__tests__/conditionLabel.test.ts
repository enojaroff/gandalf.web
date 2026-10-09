// Libellés de conditions en lecture seule : notation du mode affichage de
// l'éditeur de table (DecisionTable.vue), opérateurs en toutes lettres traduits.
import { describe, expect, it } from 'vitest'
import { conditionLabel } from '~/utils/conditionLabel'

const t = (key: string) => ({
  'dates.short.today': 'auj.',
  'dates.short.d': 'j',
  'common.true': 'Vrai',
  'common.false': 'Faux',
  'conditions.in': 'parmi',
  'conditions.contains': 'contient',
  'conditions.notBetween': 'en dehors de',
})[key] ?? key

describe('conditionLabel', () => {
  it('rend les conditions sans valeur par un symbole', () => {
    expect(conditionLabel({ condition: '$any', value: true }, 'string', t)).toBe('---')
    expect(conditionLabel({ condition: '$is_set', value: true }, 'numeric', t)).toBe('◉')
    expect(conditionLabel({ condition: '$is_null', value: true }, 'numeric', t)).toBe('∅')
  })

  it('préfixe la valeur par l\'opérateur, traduit s\'il est en toutes lettres', () => {
    expect(conditionLabel({ condition: '$eq', value: 'moquette' }, 'string', t)).toBe('= moquette')
    expect(conditionLabel({ condition: '$gte', value: 24 }, 'numeric', t)).toBe('≥ 24')
    expect(conditionLabel({ condition: '$contains', value: 'abc' }, 'string', t)).toBe('contient abc')
    expect(conditionLabel({ condition: '$in', value: 'a,b' }, 'string', t)).toBe('parmi a,b')
  })

  it('liste toutes les valeurs d\'un tableau', () => {
    expect(conditionLabel({ condition: '$in', value: ['a', 'b', 'c'] }, 'string', t)).toBe('parmi a, b, c')
  })

  it('lit un booléen comme l\'API (== de PHP)', () => {
    expect(conditionLabel({ condition: '$eq', value: true }, 'boolean', t)).toBe('Vrai')
    expect(conditionLabel({ condition: '$eq', value: false }, 'boolean', t)).toBe('Faux')
    expect(conditionLabel({ condition: '$eq', value: '0' }, 'boolean', t)).toBe('Faux')
    expect(conditionLabel({ condition: '$eq', value: 1 }, 'boolean', t)).toBe('Vrai')
    expect(conditionLabel({ condition: '$ne', value: true }, 'boolean', t)).toBe('≠ Vrai')
  })

  it('rend les intervalles avec leurs bornes incluses ou exclues', () => {
    expect(conditionLabel({ condition: '$between', value: '3;6' }, 'numeric', t)).toBe('[3 - 6]')
    expect(conditionLabel({ condition: '$between_excl', value: '3;6' }, 'numeric', t)).toBe(']3 - 6[')
    expect(conditionLabel({ condition: '$between_lexcl', value: '3;6' }, 'numeric', t)).toBe(']3 - 6]')
    expect(conditionLabel({ condition: '$between_rexcl', value: [3, 6] }, 'numeric', t)).toBe('[3 - 6[')
    expect(conditionLabel({ condition: '$not_between', value: '3;6' }, 'numeric', t)).toBe('en dehors de [3 - 6]')
  })

  it('formate les dates relatives et absolues, y compris en tableau', () => {
    expect(conditionLabel({ condition: '$lt', value: 'today-30d' }, 'date', t)).toBe('< auj. − 30 j')
    expect(conditionLabel({ condition: '$between', value: '2026-01-01;today' }, 'date', t)).toBe('[2026-01-01 - auj.]')
    expect(conditionLabel({ condition: '$between', value: ['today-30d', 'today'] }, 'date', t)).toBe('[auj. − 30 j - auj.]')
    expect(conditionLabel({ condition: '$not_between', value: 'today-30d;today' }, 'date', t)).toBe('en dehors de [auj. − 30 j - auj.]')
  })

  it('affiche un tiret pour une valeur vide et garde un opérateur inconnu', () => {
    expect(conditionLabel({ condition: '$eq', value: '' }, 'string', t)).toBe('= —')
    expect(conditionLabel({ condition: null, value: 'x' }, 'string', t)).toBe('? x')
  })
})
