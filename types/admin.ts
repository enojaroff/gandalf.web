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
  details: { application_id?: string; title?: string; user_id?: string; email?: string; username?: string; applications?: string[] }
  created_at: string
}

// Compte vu par le superadmin (onglet Comptes) : profil et applications.
export interface AdminAccount {
  _id: string
  username: string
  email: string
  // Adresse en attente de vérification
  temporary_email?: string | null
  first_name?: string
  last_name?: string
  active: boolean
  superadmin?: boolean
  must_change_password?: boolean
  created_at: string | null
  applications: { _id: string; title: string; role: string | null }[]
}

export interface AdminAccountPage {
  data: AdminAccount[]
  paging?: { size: number; total: number; current_page: number; last_page: number }
}

// Mot de passe temporaire donné à un compte par un superadmin
export interface PasswordResetResult {
  user_id: string
  username: string
  email: string
  temporary_password: string
  email_sent: boolean
}

export interface AdminLogPage {
  data: AdminLogEntry[]
  paging?: { size: number; total: number; current_page: number; last_page: number }
}
