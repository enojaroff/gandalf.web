import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useRememberedFilters } from '~/composables/useRememberedFilters'

let store: Map<string, string>

beforeEach(() => {
  store = new Map()
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const filters = () => ({ search: ref(''), category: ref('__all__'), page: ref(1) })

describe('useRememberedFilters', () => {
  it('mémorise les filtres et les réapplique au retour sur la liste', async () => {
    const first = filters()
    useRememberedFilters('tables.p1', first)
    first.search.value = 'sinistre'
    first.category.value = 'cat_1'
    first.page.value = 3
    await nextTick()

    const back = filters()
    useRememberedFilters('tables.p1', back)
    expect([back.search.value, back.category.value, back.page.value]).toEqual(['sinistre', 'cat_1', 3])
  })

  it('sépare les listes et les applications', async () => {
    const tables = filters()
    useRememberedFilters('tables.p1', tables)
    tables.search.value = 'sinistre'
    await nextTick()

    for (const key of ['flows.p1', 'tables.p2']) {
      const other = filters()
      useRememberedFilters(key, other)
      expect(other.search.value).toBe('')
    }
  })

  it('ignore les valeurs stockées invalides', () => {
    store.set('gandalf.listFilters.tables.p1', JSON.stringify({ search: 42, category: null, page: 0 }))
    const f = filters()
    useRememberedFilters('tables.p1', f)
    expect([f.search.value, f.category.value, f.page.value]).toEqual(['', '__all__', 1])

    store.set('gandalf.listFilters.tables.p1', '{illisible')
    expect(() => useRememberedFilters('tables.p1', filters())).not.toThrow()
  })

  it('ne mémorise rien sans clé ni stockage', async () => {
    const f = filters()
    useRememberedFilters(null, f)
    f.search.value = 'x'
    await nextTick()
    expect(store.size).toBe(0)

    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('indisponible') },
      setItem: () => { throw new Error('indisponible') },
    })
    const g = filters()
    useRememberedFilters('tables.p1', g)
    g.search.value = 'x'
    await nextTick()
    expect(g.search.value).toBe('x')
  })
})
