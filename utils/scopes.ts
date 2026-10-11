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
  'decisions_view',
  'decisions_make',
  'tables_publish',
  'tables_activate',
  'decisions_make_inactive',
]

export const PROJECT_CONSUMER_SCOPES: ConsumerScope[] = [
  'decisions_view',
  'decisions_make',
  'decisions_make_inactive',
]

// Droits d'un membre groupés pour les fenêtres de membres, comme l'ancienne
// interface (AngularJS) : une section par domaine. Les libellés sont traduits :
// scopes.groups.<id> pour un groupe, scopes.user.<droit> pour un droit.
export interface ScopeItem {
  key: UserScope
}
export interface ScopeGroup {
  id: 'project' | 'tables' | 'decisions' | 'consumers' | 'users'
  scopes: ScopeItem[]
}

export const PROJECT_USER_SCOPE_GROUPS: ScopeGroup[] = [
  { id: 'project', scopes: [{ key: 'project_update' }] },
  {
    id: 'tables',
    scopes: [
      { key: 'tables_create' },
      { key: 'tables_view' },
      { key: 'tables_update' },
      { key: 'tables_delete' },
      { key: 'tables_publish' },
      { key: 'tables_activate' },
    ],
  },
  {
    id: 'decisions',
    scopes: [{ key: 'decisions_view' }, { key: 'decisions_make' }, { key: 'decisions_make_inactive' }],
  },
  { id: 'consumers', scopes: [{ key: 'consumers_manage' }, { key: 'consumers_get' }] },
  { id: 'users', scopes: [{ key: 'users_manage' }] },
]

// Clés i18n des libellés. Un droit de clé d'API se lit seul, sans groupe :
// il a son propre libellé (scopes.consumer.<droit>).
export const scopeGroupTitleKey = (group: ScopeGroup): string => `scopes.groups.${group.id}`
export const userScopeLabelKey = (scope: string): string => `scopes.user.${scope}`
export const consumerScopeLabelKey = (scope: string): string => `scopes.consumer.${scope}`
