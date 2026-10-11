import { describe, expect, it } from 'vitest'
import type { DecisionField, DecisionTable } from '~/types/decision-table'
import { pinStatusOf, tablesForPins } from '~/utils/flowPins'

const field = (key: string): DecisionField => ({ _id: key, key, title: key, type: 'numeric' })
const table = (id: string, keys: string[]): DecisionTable => ({
  _id: id,
  title: id,
  matching_type: 'first',
  decision_type: 'string',
  fields: keys.map(field),
  variants: [],
})

describe('pinStatusOf', () => {
  it('tells whether a node runs its table\'s active version', () => {
    expect(pinStatusOf({ table_version_id: 'v2' }, 'v2')).toBe('active')
    expect(pinStatusOf({ table_version_id: 'v1' }, 'v2')).toBe('outdated')
    expect(pinStatusOf({ table_version_id: null }, 'v2')).toBe('unpinned')
    expect(pinStatusOf({}, null)).toBe('unpinned')
  })
})

describe('tablesForPins', () => {
  it('shows the fields of the version a node is pinned to', () => {
    const tables = [table('t1', ['age']), table('t2', ['score'])]
    const result = tablesForPins(tables, [{ table_id: 't1', table_version_id: 'v1' }], { v1: [field('years')] })
    expect(result[0]!.fields.map(f => f.key)).toEqual(['years'])
    expect(result[1]).toBe(tables[1])
  })

  it('keeps the table\'s fields while the pinned version is not loaded', () => {
    const tables = [table('t1', ['age'])]
    expect(tablesForPins(tables, [{ table_id: 't1', table_version_id: 'v9' }], {})[0]).toBe(tables[0])
  })
})
