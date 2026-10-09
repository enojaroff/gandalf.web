// Libellés de conditions en lecture seule : même rendu que le mode affichage de
// l'éditeur de table (DecisionTable.vue).
import { describe, expect, it } from 'vitest'
import { conditionLabel } from '~/utils/conditionLabel'

const t = (key: string) => ({ 'dates.short.today': 'auj.', 'dates.short.d': 'j' })[key] ?? key

describe('conditionLabel', () => {
  it('rend les conditions sans valeur par un symbole', () => {
    expect(conditionLabel({ condition: '$any', value: true }, 'string', t)).toBe('---')
    expect(conditionLabel({ condition: '$is_set', value: true }, 'numeric', t)).toBe('◉')
    expect(conditionLabel({ condition: '$is_null', value: true }, 'numeric', t)).toBe('∅')
  })

  it('préfixe la valeur par l\'opérateur', () => {
    expect(conditionLabel({ condition: '$eq', value: 'moquette' }, 'string', t)).toBe('= moquette')
    expect(conditionLabel({ condition: '$gte', value: 24 }, 'numeric', t)).toBe('≥ 24')
    expect(conditionLabel({ condition: '$in', value: 'a,b' }, 'string', t)).toBe('in a,b')
  })

  it('rend un booléen par True / False', () => {
    expect(conditionLabel({ condition: '$eq', value: true }, 'boolean', t)).toBe('True')
    expect(conditionLabel({ condition: '$eq', value: false }, 'boolean', t)).toBe('False')
  })

  it('rend les intervalles avec leurs bornes incluses ou exclues', () => {
    expect(conditionLabel({ condition: '$between', value: '3;6' }, 'numeric', t)).toBe('[3 - 6]')
    expect(conditionLabel({ condition: '$between_excl', value: '3;6' }, 'numeric', t)).toBe(']3 - 6[')
    expect(conditionLabel({ condition: '$between_lexcl', value: '3;6' }, 'numeric', t)).toBe(']3 - 6]')
    expect(conditionLabel({ condition: '$between_rexcl', value: [3, 6] }, 'numeric', t)).toBe('[3 - 6[')
  })

  it('formate les dates relatives et absolues', () => {
    expect(conditionLabel({ condition: '$lt', value: 'today-30d' }, 'date', t)).toBe('< auj. − 30 j')
    expect(conditionLabel({ condition: '$between', value: '2026-01-01;today' }, 'date', t)).toBe('[2026-01-01 - auj.]')
  })

  it('affiche un tiret pour une valeur vide et garde un opérateur inconnu', () => {
    expect(conditionLabel({ condition: '$eq', value: '' }, 'string', t)).toBe('= —')
    expect(conditionLabel({ condition: null, value: 'x' }, 'string', t)).toBe('? x')
  })
})
