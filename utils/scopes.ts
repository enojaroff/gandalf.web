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
