import { describe, expect, it } from 'vitest'
import { fieldKeyError, normalizeFieldKey } from '~/utils/fieldKeys'

describe('normalizeFieldKey', () => {
  it('suit Field::normalizeKey', () => {
    expect(normalizeFieldKey(' Card BIN ')).toBe('card_bin')
  })
})

describe('fieldKeyError', () => {
  it.each([
    ['', [], 'fields.keyRequired'],
    ['date-sinistre', [], null],
    ['date.sinistre', [], 'fields.keyInvalid'],
    ['variant_id', [], 'fields.keyReserved'],
    // Les autres clés sont comparées sous leur forme stockée
    ['age', ['Age'], 'fields.keyDuplicate'],
    ['age', ['montant'], null],
  ])('%s parmi %j → %s', (key, others, expected) => {
    expect(fieldKeyError(key, others as string[])).toBe(expected)
  })
})
