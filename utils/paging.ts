// Pagination des listes de l'API (tables, flows) : le total est dans `paging`,
// { size, total, current_page, last_page } ; `meta` ne porte que le code HTTP.

export interface Paging {
  size: number
  total: number
  current_page: number
  last_page: number
}

// Nombre total d'éléments d'une liste paginée. Un total numérique en chaîne est
// accepté ; sans total exploitable (liste non paginée), le nombre d'éléments reçus.
export function listTotal(response: { data?: unknown[]; paging?: { total?: unknown } | null }): number {
  const raw = response.paging?.total
  const total = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw
  return typeof total === 'number' && Number.isFinite(total) ? total : (response.data?.length ?? 0)
}
