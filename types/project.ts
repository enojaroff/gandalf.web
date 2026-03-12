export type UserScope =
  | 'tables_create'
  | 'tables_view'
  | 'tables_update'
  | 'tables_delete'
  | 'consumers_get'
  | 'consumers_manage'
  | 'users_manage'
  | 'project_update'
  | 'project_delete'
  | 'decisions_view'

export type ConsumerScope = 'decisions_view' | 'decisions_make'

export interface Project {
  _id: string
  title: string
  description?: string
  settings?: Record<string, unknown>
}

export interface ProjectUser {
  _id?: string
  user_id: string
  role: string
  scope: UserScope[]
  email?: string
  username?: string
}

export interface ProjectConsumer {
  client_id: string
  description: string
  scope: ConsumerScope[]
  access_token?: string
}

export interface User {
  _id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  is_active?: boolean
  avatar?: string
}
