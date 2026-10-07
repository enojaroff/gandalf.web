import { watch } from 'vue'
import type { Ref } from 'vue'

// Filtres d'une liste (recherche, catégorie, page) mémorisés pour l'onglet du
// navigateur et réappliqués quand on revient sur la liste. `key` distingue la
// liste et l'application (une catégorie n'existe que dans son application) ;
// sans clé, rien n'est mémorisé. Une valeur stockée n'est reprise que si elle a
// le type de la valeur courante, et un nombre (la page) que s'il est entier et
// au moins 1. Sans stockage disponible (navigation privée, quota), la liste
// fonctionne simplement sans mémoire.
export function useRememberedFilters(key: string | null, refs: Record<string, Ref<string | number>>) {
  if (!key) return
  const storageKey = `gandalf.listFilters.${key}`

  let saved: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '{}')
    if (parsed && typeof parsed === 'object') saved = parsed as Record<string, unknown>
  }
  catch { /* stockage indisponible ou valeur illisible */ }

  for (const [name, target] of Object.entries(refs)) {
    const value = saved[name]
    if (typeof value !== typeof target.value) continue
    if (typeof value === 'number' && !(Number.isInteger(value) && value >= 1)) continue
    target.value = value as string | number
  }

  watch(
    () => Object.fromEntries(Object.entries(refs).map(([name, r]) => [name, r.value])),
    (values) => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(values))
      }
      catch { /* stockage indisponible */ }
    },
  )
}
