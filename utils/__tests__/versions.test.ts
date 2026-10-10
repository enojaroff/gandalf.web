import { describe, expect, it } from 'vitest'
import type { TableVersionSummary } from '~/types/version'
import {
  defaultDraftName,
  descendsFrom,
  divergence,
  isSplitValid,
  sortVersions,
  splitTotal,
  versionNumberLabel,
} from '~/utils/versions'

const version = (id: string, extra: Partial<TableVersionSummary> = {}): TableVersionSummary => ({
  _id: id,
  table_id: 't',
  status: 'published',
  number: null,
  name: '',
  comment: '',
  origin_version_id: null,
  autopublished: false,
  variants_probability: 'first',
  created_by: null,
  published_by: null,
  published_at: null,
  created_at: '2026-10-10T10:00:00+00:00',
  updated_at: '2026-10-10T10:00:00+00:00',
  is_active: false,
  ...extra,
})

describe('descendsFrom', () => {
  // v1 <- v2 <- draft ; v1 <- other
  const versions = [
    version('v1'),
    version('v2', { origin_version_id: 'v1' }),
    version('draft', { status: 'draft', origin_version_id: 'v2' }),
    version('other', { origin_version_id: 'v1' }),
  ]

  it('follows the chain of origins', () => {
    expect(descendsFrom('draft', 'v1', versions)).toBe(true)
    expect(descendsFrom('draft', 'draft', versions)).toBe(true)
  })

  it('is false for another branch or an ancestor', () => {
    expect(descendsFrom('other', 'v2', versions)).toBe(false)
    expect(descendsFrom('v1', 'v2', versions)).toBe(false)
  })

  it('ends on a cycle', () => {
    expect(descendsFrom('a', 'z', [version('a', { origin_version_id: 'b' }), version('b', { origin_version_id: 'a' })])).toBe(false)
  })
})

describe('divergence', () => {
  it('names the active version a branch or a rollback would skip', () => {
    const versions = [
      version('v1', { number: 1 }),
      version('v2', { number: 2, origin_version_id: 'v1', is_active: true }),
      version('b', { status: 'draft', origin_version_id: 'v1' }),
    ]
    expect(divergence(versions[2]!, versions)?._id).toBe('v2')
    expect(divergence(versions[0]!, versions)?._id).toBe('v2')
  })

  it('is null for a version that starts from the active one, or the active one', () => {
    const versions = [
      version('v1', { is_active: true }),
      version('d', { status: 'draft', origin_version_id: 'v1' }),
    ]
    expect(divergence(versions[1]!, versions)).toBeNull()
    expect(divergence(versions[0]!, versions)).toBeNull()
    expect(divergence(versions[1]!, [versions[1]!])).toBeNull()
  })
})

describe('labels and order', () => {
  it('labels a published version by its number only', () => {
    expect(versionNumberLabel(version('x', { number: 3 }))).toBe('v3')
    expect(versionNumberLabel(version('x', { status: 'draft' }))).toBeNull()
  })

  it('lists drafts first, latest edited first, then versions newest first', () => {
    const sorted = sortVersions([
      version('v1', { number: 1 }),
      version('old', { status: 'draft', updated_at: '2026-10-01T00:00:00+00:00' }),
      version('v3', { number: 3 }),
      version('new', { status: 'draft', updated_at: '2026-10-09T00:00:00+00:00' }),
    ])
    expect(sorted.map(v => v._id)).toEqual(['new', 'old', 'v3', 'v1'])
  })

  it('names a draft after its creation time', () => {
    expect(defaultDraftName(new Date(2026, 9, 10, 9, 5))).toBe('2026-10-10 09:05')
  })
})

describe('split', () => {
  it('requires 100 % in percent mode only', () => {
    expect(splitTotal([{ probability: 70 }, { probability: 30 }])).toBe(100)
    expect(isSplitValid('percent', [{ probability: 70 }, { probability: 20 }])).toBe(false)
    expect(isSplitValid('percent', [{ probability: 70 }, { probability: 30 }])).toBe(true)
    expect(isSplitValid('first', [{ probability: 0 }])).toBe(true)
  })
})
