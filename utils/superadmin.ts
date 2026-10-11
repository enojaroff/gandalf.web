import type { AdminAccount, AdminLogEntry } from '~/types/admin'
import type { Project } from '~/types/project'

// Admins d'une application (e-mail, ou nom d'utilisateur à défaut), dans l'ordre
// de ses membres.
export function applicationAdmins(project: Project): string[] {
  return (project.users ?? [])
    .filter(user => user.role === 'admin')
    .map(user => user.email || user.username || user.user_id)
}

// Libellé d'une entrée du journal : une clé i18n et ses paramètres, ou le texte
// de la requête (méthode et chemin) qui ne se traduit pas.
export type LogEntryLabel =
  | {
    key: 'admin.logGrant' | 'admin.logRevoke' | 'admin.logAccountDeleted' | 'admin.logPasswordReset' | 'admin.logAccountCreated'
    params: { email: string }
  }
  | { text: string }

// Actions sur un compte, reconnues à leur requête quand l'API a noté le compte
// visé (une requête refusée avant n'a pas de détails : son texte s'affiche).
const ACCOUNT_REQUESTS: { method: string; path: RegExp; key: 'admin.logAccountDeleted' | 'admin.logPasswordReset' | 'admin.logAccountCreated' }[] = [
  { method: 'DELETE', path: /^\/api\/v1\/superadmin\/users\/[0-9a-z]{24}$/, key: 'admin.logAccountDeleted' },
  { method: 'POST', path: /^\/api\/v1\/superadmin\/users\/[0-9a-z]{24}\/password$/, key: 'admin.logPasswordReset' },
  { method: 'POST', path: /^\/api\/v1\/projects\/collaborators\/account$/, key: 'admin.logAccountCreated' },
]

export function logEntryLabel(entry: AdminLogEntry): LogEntryLabel {
  if (entry.action === 'superadmin.grant' || entry.action === 'superadmin.revoke') {
    return {
      key: entry.action === 'superadmin.grant' ? 'admin.logGrant' : 'admin.logRevoke',
      params: { email: entry.details.email ?? entry.details.user_id ?? '' },
    }
  }
  const account = entry.details.email || entry.details.username
  const known = ACCOUNT_REQUESTS.find(r => r.method === entry.method && r.path.test(entry.path ?? ''))
  if (known && account) return { key: known.key, params: { email: account } }
  return { text: `${entry.method ?? ''} ${entry.path ?? ''}`.trim() }
}

// Un superadmin n'agit ni sur son propre compte (il passe par son profil) ni
// sur celui d'un autre superadmin (l'indicateur se retire sur le serveur).
export function accountLocked(account: AdminAccount, selfId: string | undefined): boolean {
  return account._id === selfId || account.superadmin === true
}

// Ce qu'il faut saisir pour confirmer la suppression : l'adresse du compte,
// celle en attente à défaut, sinon son nom d'utilisateur.
export function deleteConfirmation(account: AdminAccount): string {
  return account.email || account.temporary_email || account.username
}

// Couleur du statut HTTP d'une entrée : succès, refus (4xx) ou erreur (5xx).
export function logStatusColor(status: number | null | undefined): 'success' | 'warning' | 'error' | 'neutral' {
  if (!status) return 'neutral'
  if (status >= 500) return 'error'
  if (status >= 400) return 'warning'
  return 'success'
}
