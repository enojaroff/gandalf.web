import { describe, expect, it } from 'vitest'
import { listTotal } from '~/utils/paging'

describe('listTotal', () => {
  it('lit le total dans paging, pas dans meta', () => {
    // Réponse réelle de GET /v1/admin/tables : 22 tables, 20 par page
    const response = {
      meta: { code: 200 },
      data: Array.from({ length: 20 }, (_, i) => ({ _id: String(i) })),
      paging: { size: 20, total: 22, current_page: 1, last_page: 2 },
    }
    expect(listTotal(response)).toBe(22)
  })

  it('garde un total nul', () => {
    expect(listTotal({ data: [], paging: { total: 0 } })).toBe(0)
  })

  it('compte les éléments reçus quand paging est absent', () => {
    expect(listTotal({ data: [{}, {}, {}] })).toBe(3)
    expect(listTotal({ data: [{}], paging: null })).toBe(1)
    expect(listTotal({})).toBe(0)
  })
})
