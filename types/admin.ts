// Journal d'administration (gandalf.api, ADMIN.md) : une action d'un superadmin.
export type AdminLogAction = 'request' | 'superadmin.grant' | 'superadmin.revoke'

export interface AdminLogEntry {
  _id: string
  // Le superadmin ; null pour une commande `gandalf:superadmin`
  user_id: string | null
  email: string | null
  action: AdminLogAction
  method?: string | null
  path?: string | null
  application_id?: string | null
  status?: number | null
  ip?: string | null
  // Ce que le contrôleur a noté : application créée ou supprimée, compte concerné
  details: { application_id?: string; title?: string; user_id?: string; email?: string }
  created_at: string
}

export interface AdminLogPage {
  data: AdminLogEntry[]
  paging?: { size: number; total: number; current_page: number; last_page: number }
}
