import type { UserScope, ConsumerScope } from '~/types/project'

export const PROJECT_USER_SCOPES: UserScope[] = [
  'tables_create',
  'tables_view',
  'tables_update',
  'tables_delete',
  'consumers_get',
  'consumers_manage',
  'users_manage',
  'project_update',
  'project_delete',
  'decisions_view',
]

export const PROJECT_CONSUMER_SCOPES: ConsumerScope[] = [
  'decisions_view',
  'decisions_make',
]

// Project-user scopes grouped for the collaborator form, mirroring the original
// (AngularJS) UI: one section per resource area, each scope with a short label.
export interface ScopeItem {
  key: string
  label: string
}
export interface ScopeGroup {
  title: string
  scopes: ScopeItem[]
}

export const PROJECT_USER_SCOPE_GROUPS: ScopeGroup[] = [
  {
    title: 'Project',
    scopes: [
      { key: 'project_update', label: 'Change Settings' },
      { key: 'project_delete', label: 'Delete' },
    ],
  },
  {
    title: 'Decision Tables',
    scopes: [
      { key: 'tables_create', label: 'Create' },
      { key: 'tables_view', label: 'View' },
      { key: 'tables_update', label: 'Update' },
      { key: 'tables_delete', label: 'Delete' },
    ],
  },
  {
    title: 'Decision History',
    scopes: [
      { key: 'decisions_view', label: 'View' },
      { key: 'decisions_make', label: 'Make' },
    ],
  },
  {
    title: 'API Consumer Credentials',
    scopes: [
      { key: 'consumers_manage', label: 'Manage' },
      { key: 'consumers_get', label: 'Read' },
    ],
  },
  {
    title: 'Project Collaborators',
    scopes: [
      { key: 'users_manage', label: 'Manage' },
    ],
  },
]
