import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useRowSelection } from '~/composables/useRowSelection'

const rows = () => ref([{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }])

describe('useRowSelection', () => {
  it('suit l\'état de la case d\'en-tête', () => {
    const s = useRowSelection(rows())
    expect(s.allState.value).toBe(false)
    s.toggleRow('a', true)
    expect(s.allState.value).toBe('indeterminate')
    s.toggleAll(true)
    expect(s.allState.value).toBe(true)
    expect(s.selected.value.map(r => r._id)).toEqual(['a', 'b', 'c'])
    s.toggleAll(false)
    expect(s.selected.value).toEqual([])
  })

  it('décoche une ligne et vide la sélection', () => {
    const s = useRowSelection(rows())
    s.toggleRow('a', true)
    s.toggleRow('b', true)
    s.toggleRow('a', false)
    expect(s.isSelected('a')).toBe(false)
    expect(s.selected.value.map(r => r._id)).toEqual(['b'])
    s.clear()
    expect(s.selected.value).toEqual([])
  })

  it('ne retient que les lignes encore affichées', () => {
    const list = rows()
    const s = useRowSelection(list)
    s.toggleAll(true)
    // Une ligne disparaît (ex. déplacée vers un autre projet)
    list.value = list.value.filter(r => r._id !== 'b')
    expect(s.selected.value.map(r => r._id)).toEqual(['a', 'c'])
    expect(s.allState.value).toBe(true)
  })
})
