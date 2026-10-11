import type { AdminLogEntry } from '~/types/admin'
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
  | { key: 'admin.logGrant' | 'admin.logRevoke'; params: { email: string } }
  | { text: string }

export function logEntryLabel(entry: AdminLogEntry): LogEntryLabel {
  if (entry.action === 'superadmin.grant' || entry.action === 'superadmin.revoke') {
    return {
      key: entry.action === 'superadmin.grant' ? 'admin.logGrant' : 'admin.logRevoke',
      params: { email: entry.details.email ?? entry.details.user_id ?? '' },
    }
  }
  return { text: `${entry.method ?? ''} ${entry.path ?? ''}`.trim() }
}

// Couleur du statut HTTP d'une entrée : succès, refus (4xx) ou erreur (5xx).
export function logStatusColor(status: number | null | undefined): 'success' | 'warning' | 'error' | 'neutral' {
  if (!status) return 'neutral'
  if (status >= 500) return 'error'
  if (status >= 400) return 'warning'
  return 'success'
}
