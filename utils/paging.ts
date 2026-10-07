// Pagination des listes de l'API (tables, flows) : le total est dans `paging`,
// { size, total, current_page, last_page } ; `meta` ne porte que le code HTTP.

export interface Paging {
  size: number
  total: number
  current_page: number
  last_page: number
}

// Nombre total d'éléments d'une liste paginée ; à défaut, le nombre d'éléments reçus.
export function listTotal(response: { data?: unknown[]; paging?: Partial<Paging> | null }): number {
  const total = response.paging?.total
  return typeof total === 'number' ? total : (response.data?.length ?? 0)
}
