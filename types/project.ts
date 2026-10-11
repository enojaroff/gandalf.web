export type UserScope =
  | 'tables_create'
  | 'tables_view'
  | 'tables_update'
  | 'tables_delete'
  | 'consumers_get'
  | 'consumers_manage'
  | 'users_manage'
  | 'project_update'
  | 'decisions_view'
  // Versions des tables : publier, mettre en production, exécuter une version
  // inactive (droit qu'un utilisateur doit avoir pour le donner à une clé)
  | 'tables_publish'
  | 'tables_activate'
  | 'decisions_make_inactive'

export type ConsumerScope = 'decisions_view' | 'decisions_make' | 'decisions_make_inactive'

export interface Project {
  _id: string
  title: string
  description?: string
  settings?: Record<string, unknown>
  // Membres de l'application, renvoyés par GET /v1/projects
  users?: ProjectUser[]
}

export interface ProjectUser {
  _id?: string
  user_id: string
  role: string
  scope: UserScope[]
  email?: string
  username?: string
  // Entrée d'un superadmin (gandalf.api, ADMIN.md) : admin de toutes les
  // applications ; `member` dit s'il en est aussi membre.
  superadmin?: boolean
  member?: boolean
}

export interface ProjectConsumer {
  client_id: string
  description: string
  scope: ConsumerScope[]
  access_token?: string
}

export type CollaboratorStatus = 'active' | 'pending' | 'invited'

export interface Collaborator {
  user_id: string | null
  email: string | null
  username: string | null
  role: string
  scope: string[]
  status: CollaboratorStatus
}

export interface ConfirmCollaboratorResult {
  user_id: string
  // Compte créé depuis une invitation : son nom d'utilisateur
  username?: string
  email: string
  status: 'active'
  temporary_password?: string
  // Le mot de passe temporaire est aussi parti par e-mail
  email_sent?: boolean
}

// Compte créé directement dans l'application (admin), avec un mot de passe
// temporaire montré une seule fois.
export interface CreatedAccount {
  user_id: string
  username: string
  email: string
  status: 'active'
  temporary_password: string
  email_sent: boolean
}

// Free-form per-user UI preferences, persisted with the profile. Typed for the
// keys we know; open-ended so new preferences can be added without a type churn.
export interface UserSettings {
  // Flow editor pointer mode: 'mouse' or 'trackpad'.
  flow_input_mode?: 'mouse' | 'trackpad'
  [key: string]: unknown
}

export interface User {
  _id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  is_active?: boolean
  avatar?: string
  settings?: UserSettings
  // Présent et vrai pour un superadmin (Claims IA) : crée et supprime les
  // applications, agit dans toutes (gandalf.api, ADMIN.md).
  superadmin?: boolean
  // Mot de passe temporaire à remplacer : l'API refuse tout le reste (403
  // password_change_required) tant qu'il n'est pas changé.
  must_change_password?: boolean
}
