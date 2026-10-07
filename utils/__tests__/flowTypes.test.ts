// Mêmes familles que FlowRepository::typeFamily côté API.
import { describe, expect, it } from 'vitest'
import { tableOutputType, typesCompatible } from '~/utils/flowTypes'

describe('typesCompatible', () => {
  it.each([
    ['string', 'string', true],
    ['alpha_num', 'string', true],
    ['numeric', 'numeric', true],
    ['boolean', 'boolean', true],
    ['date', 'date', true],
    ['string', 'numeric', false],
    ['date', 'string', false],
    ['numeric', 'boolean', false],
    ['json', 'string', false],
    ['json', 'json', false],
    [undefined, 'string', false],
  ])('%s → %s : %s', (source, target, expected) => {
    expect(typesCompatible(source, target)).toBe(expected)
  })
})

describe('tableOutputType', () => {
  it('est numérique en scoring, sinon le decision_type', () => {
    expect(tableOutputType({ matching_type: 'scoring_sum', decision_type: 'alpha_num' })).toBe('numeric')
    expect(tableOutputType({ matching_type: 'first', decision_type: 'alpha_num' })).toBe('alpha_num')
    expect(tableOutputType({ matching_type: 'first', decision_type: 'json' })).toBe('json')
  })
})
