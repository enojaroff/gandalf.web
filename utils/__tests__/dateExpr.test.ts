// Grammaire des dates côté front : doit rester alignée sur App\Services\DateValue
// (tests/unit/DateValueTest.php côté API). "Aujourd'hui" est fixé au 31/03/2026.
import { describe, expect, it } from 'vitest'
import {
  dateExprLabel,
  formatRelative,
  isIsoDate,
  isValidDateCondition,
  parseRelative,
  toDayNumber,
  todayIso,
} from '~/utils/dateExpr'
import { isConditionValidForType } from '~/utils/transforms'

const NOW = new Date(2026, 2, 31, 12, 0)
const day = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000

describe('isIsoDate', () => {
  it.each([
    ['2026-03-15', true],
    ['2026-03-15T23:30:00+02:00', true],
    ['2026-03-15 08:00', true],
    ['2024-02-29', true],
    ['2026-02-29', false],
    ['2026-03-15T24:00', false],
    ['15/03/2026', false],
    ['today', false],
    [20260315, false],
  ])('%s → %s', (value, expected) => {
    expect(isIsoDate(value)).toBe(expected)
  })
})

describe('dates relatives', () => {
  it.each([
    ['today', '2026-03-31'],
    ['today-30d', '2026-03-01'],
    ['today+1d', '2026-04-01'],
    ['today-2w', '2026-03-17'],
    ['today-1m', '2026-02-28'],
    ['today-15m', '2024-12-31'],
    ['today-18y', '2008-03-31'],
    [' Today - 30D ', '2026-03-01'],
  ])('%s → %s', (expr, iso) => {
    expect(toDayNumber(expr, NOW)).toBe(day(iso))
  })

  it('ignore l\'heure d\'une date ISO', () => {
    expect(toDayNumber('2026-03-15T23:30:00+02:00')).toBe(day('2026-03-15'))
  })

  it('rejette les expressions invalides', () => {
    for (const expr of ['today-3h', 'today-1y+2d', 'yesterday', 'now']) {
      expect(toDayNumber(expr, NOW)).toBeNull()
    }
  })

  it('parse et sérialise sous forme canonique', () => {
    expect(parseRelative('Today - 30D')).toEqual({ offset: -30, unit: 'd' })
    expect(formatRelative({ offset: -30, unit: 'd' })).toBe('today-30d')
    expect(formatRelative({ offset: 0, unit: 'm' })).toBe('today')
  })

  it('donne la date du jour en ISO', () => {
    expect(todayIso(NOW)).toBe('2026-03-31')
  })
})

describe('isValidDateCondition', () => {
  it.each([
    ['$gte', 'today-30d', true],
    ['$eq', '2026-03-15', true],
    ['$between', '2026-01-01;2026-12-31', true],
    ['$between', 'today-1y;today', true],
    ['$between', '2026-12-31;2026-01-01', false],
    ['$between', '2026-01-01;2026-01-01', false],
    ['$gt', '42', false],
    ['$contains', '2026', false],
    ['$any', null, true],
  ])('%s %s → %s', (op, value, expected) => {
    expect(isValidDateCondition(op, value, NOW)).toBe(expected)
  })
})

describe('dateExprLabel', () => {
  const t = (key: string) => ({ 'dates.short.today': 'auj.', 'dates.short.d': 'j', 'dates.short.y': 'an(s)' })[key] ?? key

  it('formate les dates relatives et absolues', () => {
    expect(dateExprLabel('today', t)).toBe('auj.')
    expect(dateExprLabel('today-30d', t)).toBe('auj. − 30 j')
    expect(dateExprLabel('today+1y', t)).toBe('auj. + 1 an(s)')
    expect(dateExprLabel('2026-03-15T10:00:00Z', t)).toBe('2026-03-15')
  })
})

describe('isConditionValidForType', () => {
  it('suit les règles de l\'API pour chaque type', () => {
    expect(isConditionValidForType('date', { field_key: 'd', condition: '$gt', value: 10 })).toBe(false)
    expect(isConditionValidForType('date', { field_key: 'd', condition: '$gte', value: 'today-30d' })).toBe(true)
    expect(isConditionValidForType('numeric', { field_key: 'd', condition: '$gte', value: 'today-30d' })).toBe(false)
    expect(isConditionValidForType('numeric', { field_key: 'd', condition: '$between', value: '1;5' })).toBe(true)
    expect(isConditionValidForType('numeric', { field_key: 'd', condition: '$between', value: '5;1' })).toBe(false)
    // Égalité sans type de valeur imposé : acceptée pour un texte
    expect(isConditionValidForType('string', { field_key: 'd', condition: '$eq', value: '2026-03-15' })).toBe(true)
    expect(isConditionValidForType('boolean', { field_key: 'd', condition: '$any', value: null })).toBe(true)
  })
})
