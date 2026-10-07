import { computed, ref } from 'vue'
import type { Ref } from 'vue'

// Sélection de lignes pour les commandes en masse des listes (tables, flows).
// Par _id, pas par index de ligne : après une recherche ou un changement de page,
// la « ligne 3 » n'est plus la même ressource. `selected` ne retient que les
// lignes affichées ; la liste appelle clear() à chaque rechargement, pour qu'une
// commande ne s'applique jamais à des ressources devenues invisibles.
export function useRowSelection<T extends { _id: string }>(rows: Ref<T[]>) {
  const selectedIds = ref(new Set<string>())

  const selected = computed(() => rows.value.filter(r => selectedIds.value.has(r._id)))

  // État de la case d'en-tête
  const allState = computed<boolean | 'indeterminate'>(() => {
    if (!selected.value.length) return false
    return selected.value.length === rows.value.length ? true : 'indeterminate'
  })

  function isSelected(id: string): boolean {
    return selectedIds.value.has(id)
  }

  function toggleRow(id: string, on: boolean) {
    if (on) selectedIds.value.add(id)
    else selectedIds.value.delete(id)
  }

  function toggleAll(on: boolean) {
    selectedIds.value = new Set(on ? rows.value.map(r => r._id) : [])
  }

  function clear() {
    selectedIds.value = new Set()
  }

  return { selected, allState, isSelected, toggleRow, toggleAll, clear }
}
