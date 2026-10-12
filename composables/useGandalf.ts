import type { OAuthToken } from '~/types/api'
import type { DecisionTable } from '~/types/decision-table'
import type { Project, ProjectUser, ProjectConsumer, User, Collaborator, ConfirmCollaboratorResult, CreatedAccount } from '~/types/project'
import type { Group } from '~/types/group'
import type { Flow, FlowRun, FlowResult } from '~/types/flow'
import type { Category } from '~/types/category'
import type { AdminAccountPage, AdminLogPage, PasswordResetResult } from '~/types/admin'
import type {
  ActivationMeta,
  FlowUpdateResult,
  FlowVersion,
  FlowVersionSummary,
  SplitMode,
  TableFlowUsage,
  TableVersion,
  TableVersionSummary,
  VersionCall,
  VersionDivergence,
} from '~/types/version'

function btoa64(str: string): string {
  return btoa(str)
}

interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  params?: Record<string, string | number | undefined>
  skipRefreshToken?: boolean
  body?: unknown
}


// Meta of a table update: what a field rename changed (TablesController::update)
export interface TableUpdateMeta {
  code?: number
  field_renames?: Record<string, string>
  flows_updated?: string[]
  flows_failed?: string[]
  // Updated, but their graph no longer validates (fix before their next save)
  flows_invalid?: string[]
}

// Contenu d'un brouillon envoyé à l'API (les clés absentes ne changent pas)
export interface VersionContent {
  name?: string
  fields?: unknown[]
  variants?: unknown[]
  variants_probability?: string
}

// Corps d'une exécution de test (route v2 sans `version`)
export interface VersionRunBody {
  variant_id?: string
  data: Record<string, unknown>
}

// Réponse d'un import : la table, ou le brouillon écrit (imported_into = version)
export interface ImportResponse {
  data: DecisionTable | TableVersion
  meta?: { imported_into?: 'table' | 'version' }
}

export function useGandalf() {
  const config = useRuntimeConfig()

  const apiBase = config.public.apiProxyPath as string
  const clientId = config.public.apiClientId as string
  const clientSecret = config.public.apiClientSecret as string

  function basicAuthHeader(): string {
    return 'Basic ' + btoa64(`${clientId}:${clientSecret}`)
  }

  function buildUrl(endpoint: string, params?: Record<string, string | number | undefined>): string {
    if (!params) return endpoint
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    return query ? `${endpoint}?${query}` : endpoint
  }

  async function request<T>(endpoint: string, opts: RequestOptions = {}): Promise<T> {
    const { method = 'GET', headers = {}, params, body, skipRefreshToken = false } = opts

    // Accès aux stores à l'intérieur de request() pour éviter la dépendance circulaire
    const authStore = useAuthStore()
    const projectsStore = useProjectsStore()

    const url = buildUrl(endpoint, params)

    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    if (authStore.accessToken && authStore.tokenType) {
      reqHeaders['Authorization'] = `${authStore.tokenType} ${authStore.accessToken}`
    }

    // Un X-Application explicite (agir sur une autre application) l'emporte
    if (projectsStore.selectedProjectId && !reqHeaders['X-Application']) {
      reqHeaders['X-Application'] = projectsStore.selectedProjectId
    }

    try {
      const result = await $fetch<T>(url, {
        method: method as 'GET' | 'POST' | 'PUT' | 'DELETE',
        headers: reqHeaders,
        body: body ?? undefined,
      })
      return (typeof result === 'string' ? JSON.parse(result) : result) as T
    }
    catch (error: unknown) {
      const fetchError = error as { statusCode?: number; data?: { error?: string; meta?: { error?: string } } }

      // Mot de passe temporaire : l'API refuse tout tant qu'il n'est pas changé
      if (fetchError?.statusCode === 403 && fetchError?.data?.meta?.error === 'password_change_required') {
        navigateTo('/auth/change-password')
        throw error
      }

      if (fetchError?.statusCode === 401 && !skipRefreshToken && authStore.refreshToken) {
        try {
          await _refreshToken(authStore)
          return request<T>(endpoint, { ...opts, skipRefreshToken: true })
        }
        catch {
          authStore.logout()
          navigateTo('/auth/sign-in')
          throw error
        }
      }

      if (fetchError?.statusCode === 400 && fetchError?.data?.error === 'invalid_grant') {
        authStore.logout()
        navigateTo('/auth/sign-in')
      }

      throw error
    }
  }

  async function _refreshToken(authStore: ReturnType<typeof useAuthStore>): Promise<OAuthToken> {
    if (!authStore.refreshToken) throw new Error('No refresh token')

    const response = await $fetch<OAuthToken>(`${apiBase}/v1/oauth`, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: authStore.refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    authStore.setToken(response)
    return response
  }

  // ─── Auth / OAuth ─────────────────────────────────────────────────────────

  const auth = {
    signIn: (username: string, password: string) =>
      request<OAuthToken>(`${apiBase}/v1/oauth`, {
        method: 'POST',
        headers: { Authorization: basicAuthHeader() },
        body: { username, password, grant_type: 'password' },
        skipRefreshToken: true,
      }),

    signUp: (user: { username: string; password: string; email: string }) =>
      request(`${apiBase}/v1/users`, {
        method: 'POST',
        headers: { Authorization: basicAuthHeader() },
        body: user,
      }),

    resetPassword: (email: string) =>
      request(`${apiBase}/v1/users/password/reset`, {
        method: 'POST',
        headers: { Authorization: basicAuthHeader() },
        body: { email },
      }),

    resetPasswordConfirm: (token: string, password: string) =>
      request(`${apiBase}/v1/users/password/reset`, {
        method: 'PUT',
        headers: { Authorization: basicAuthHeader() },
        body: { token, password },
      }),

    verifyEmail: (token: string) =>
      request(`${apiBase}/v1/users/verify/email`, {
        method: 'POST',
        headers: { Authorization: basicAuthHeader() },
        body: { token },
      }),

    resendVerifyEmail: (email: string) =>
      request(`${apiBase}/v1/users/verify/email/resend`, {
        method: 'POST',
        headers: { Authorization: basicAuthHeader() },
        body: { email },
      }),
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  const users = {
    current: () => request<{ data: User }>(`${apiBase}/v1/users/current`),

    update: (user: Partial<User> & { current_password?: string; password?: string }) =>
      request<{ data: User }>(`${apiBase}/v1/users/current`, {
        method: 'PUT',
        body: user,
      }),

    list: (size?: number, page?: number, name?: string) =>
      request<{ data: User[]; meta: unknown }>(`${apiBase}/v1/users`, {
        params: { size, page, name },
      }),
  }

  // ─── Projects ─────────────────────────────────────────────────────────────

  const projects = {
    list: (size?: number, page?: number) =>
      request<{ data: Project[] }>(`${apiBase}/v1/projects`, {
        params: { size, page },
      }),

    current: () => request<{ data: Project }>(`${apiBase}/v1/projects/current`),

    create: (project: Partial<Project>) =>
      request<{ data: Project }>(`${apiBase}/v1/projects`, {
        method: 'POST',
        body: project,
      }),

    update: (project: Partial<Project>) =>
      request<{ data: Project }>(`${apiBase}/v1/projects`, {
        method: 'PUT',
        body: project,
      }),

    // Superadmin seulement. Sans id : l'application sélectionnée.
    delete: (projectId?: string) =>
      request(`${apiBase}/v1/projects`, {
        method: 'DELETE',
        headers: projectId ? { 'X-Application': projectId } : {},
      }),

    export: () => request<unknown>(`${apiBase}/v1/projects/export`),

    // Returns the CURRENT member of the active project (a single object), not a
    // list — the backend maps this to ApplicationController@getCurrentUser.
    getUsers: () => request<{ data: ProjectUser | ProjectUser[] }>(`${apiBase}/v1/projects/users`),

    // Collaborators enriched with a confirmation status (active/pending/invited),
    // merged with pending invitations.
    getCollaborators: () =>
      request<{ data: Collaborator[] }>(`${apiBase}/v1/projects/collaborators`),

    // Admin-only: confirm a pending user, or create an account from an invitation.
    // Pass user_id for a pending user, or email for a pending invitation.
    confirmCollaborator: (payload: { user_id?: string; email?: string }) =>
      request<{ data: ConfirmCollaboratorResult }>(`${apiBase}/v1/projects/collaborators/confirm`, {
        method: 'POST',
        body: payload,
      }),

    // Admin-only: cancel a pending invitation by email.
    cancelInvitation: (email: string) =>
      request(`${apiBase}/v1/projects/collaborators/invitation`, {
        method: 'DELETE',
        body: { email },
      }),

    // Admin-only: resend the invitation email for a pending invitation.
    resendInvitation: (email: string) =>
      request(`${apiBase}/v1/projects/collaborators/invitation/resend`, {
        method: 'POST',
        body: { email },
      }),

    inviteUser: (user: { email: string; role: string; scope: string[] }) =>
      request(`${apiBase}/v1/invite`, { method: 'POST', body: user }),

    addUser: (user: { user_id: string; role: string; scope: string[] }) =>
      request(`${apiBase}/v1/projects/users`, { method: 'POST', body: user }),

    // Droits d'un membre. Le rôle n'est pas envoyé : l'API refuse `admin` ici.
    updateUser: (user: { user_id: string; scope: string[] }) =>
      request(`${apiBase}/v1/projects/users`, { method: 'PUT', body: user }),

    // Admin seulement : nomme admin un membre, qui reçoit les droits de l'appelant.
    setAdmin: (userId: string) =>
      request(`${apiBase}/v1/projects/users/admin`, { method: 'POST', body: { user_id: userId } }),

    removeUser: (userId: string) =>
      request(`${apiBase}/v1/projects/users`, {
        method: 'DELETE',
        body: { user_id: userId },
      }),

    // Admin seulement : crée un compte actif dans l'application, avec un mot de
    // passe temporaire rendu une seule fois (à changer à la première connexion).
    // `applicationId` : une autre application que celle sélectionnée (superadmin)
    createAccount: (account: { email: string; username?: string; role: string; scope: string[] }, applicationId?: string) =>
      request<{ data: CreatedAccount }>(`${apiBase}/v1/projects/collaborators/account`, {
        method: 'POST',
        body: account,
        headers: applicationId ? { 'X-Application': applicationId } : {},
      }),

    // Admin-only: permanently delete a user account (blocked by the API if the
    // account still belongs to other projects — 409 with the blocking projects).
    deleteAccount: (userId: string) =>
      request(`${apiBase}/v1/projects/collaborators/account`, {
        method: 'DELETE',
        body: { user_id: userId },
      }),

    getConsumers: () =>
      request<{ data: ProjectConsumer[] }>(`${apiBase}/v1/projects/consumers`),

    addConsumer: (consumer: { description: string; scope: string[] }) =>
      request(`${apiBase}/v1/projects/consumers`, { method: 'POST', body: consumer }),

    updateConsumer: (consumer: { client_id: string; description: string; scope: string[] }) =>
      request(`${apiBase}/v1/projects/consumers`, { method: 'PUT', body: consumer }),

    removeConsumer: (clientId: string) =>
      request(`${apiBase}/v1/projects/consumers`, {
        method: 'DELETE',
        body: { client_id: clientId },
      }),
  }

  // ─── Categories ───────────────────────────────────────────────────────────
  // Liste de catégories propre à l'application courante (scopée par le header
  // X-Application, comme les autres routes projet). GET lit la liste ; PUT la
  // remplace entièrement (réservé aux admins projet côté API).

  const categories = {
    list: () =>
      request<{ data: { categories: Category[] } }>(`${apiBase}/v1/admin/categories`),

    replace: (list: Category[]) =>
      request<{ data: { categories: Category[] } }>(`${apiBase}/v1/admin/categories`, {
        method: 'PUT',
        body: { categories: list },
      }),
  }

  // ─── Tables ───────────────────────────────────────────────────────────────

  const tables = {
    list: (size?: number, page?: number, filter?: { title?: string; description?: string; category_id?: string }) =>
      request<{ data: DecisionTable[]; meta: unknown }>(`${apiBase}/v1/admin/tables`, {
        params: { size, page, ...filter },
      }),

    getById: (id: string) =>
      request<{ data: DecisionTable }>(`${apiBase}/v1/admin/tables/${id}`),

    create: (table: Partial<DecisionTable>) =>
      request<{ data: DecisionTable }>(`${apiBase}/v1/admin/tables/`, {
        method: 'POST',
        body: table,
      }),

    update: (id: string, table: Partial<DecisionTable>) =>
      request<{ data: DecisionTable; meta?: TableUpdateMeta }>(`${apiBase}/v1/admin/tables/${id}`, {
        method: 'PUT',
        body: table,
      }),

    delete: (id: string) =>
      request(`${apiBase}/v1/admin/tables/${id}`, { method: 'DELETE' }),

    copy: (id: string) =>
      request<{ data: DecisionTable }>(`${apiBase}/v1/admin/tables/${id}/copy`, {
        method: 'POST',
      }),

    // Copy the table into another project (admin only). The source is the active
    // project (X-Application header); the destination is in the URL.
    copyTo: (id: string, projectId: string) =>
      request<{ data: DecisionTable }>(`${apiBase}/v1/admin/tables/${id}/copyto/${projectId}`, {
        method: 'POST',
      }),

    // Move the table to another project (admin only): it leaves the source.
    moveTo: (id: string, projectId: string) =>
      request<{ data: DecisionTable }>(`${apiBase}/v1/admin/tables/${id}/moveto/${projectId}`, {
        method: 'POST',
      }),

    getChangelogs: (tableId: string) =>
      request<{ data: unknown[] }>(`${apiBase}/v1/admin/changelog/tables/${tableId}`),

    getAllChangelogs: () =>
      request<{ data: unknown[] }>(`${apiBase}/v1/admin/changelog/tables`),

    getDiff: (tableId: string, compareId: string) =>
      request<{ data: unknown }>(`${apiBase}/v1/admin/changelog/tables/${tableId}/diff`, {
        params: { compare_with: compareId },
      }),

    rollback: (tableId: string, rollbackId: string) =>
      request(`${apiBase}/v1/admin/changelog/tables/${tableId}/rollback/${rollbackId}`, {
        method: 'POST',
      }),

    getAnalytics: (tableId: string, variantId: string) =>
      request<{ data: unknown }>(`${apiBase}/v1/admin/tables/${tableId}/${variantId}/analytics`),

    // Versions (gandalf.api, VERSIONS.md) : brouillons, publication, activation,
    // répartition, exécutions de test, appels des clés, flows qui utilisent la table.
    versions: {
      list: (tableId: string) =>
        request<{ data: TableVersionSummary[] }>(`${apiBase}/v1/admin/tables/${tableId}/versions`),

      get: (tableId: string, versionId: string) =>
        request<{ data: TableVersion }>(`${apiBase}/v1/admin/tables/${tableId}/versions/${versionId}`),

      // Brouillon tiré de from_version_id (par défaut la version active)
      create: (tableId: string, body: { from_version_id?: string; name?: string } = {}) =>
        request<{ data: TableVersion }>(`${apiBase}/v1/admin/tables/${tableId}/versions`, {
          method: 'POST',
          body,
        }),

      update: (tableId: string, versionId: string, content: VersionContent) =>
        request<{ data: TableVersion }>(`${apiBase}/v1/admin/tables/${tableId}/versions/${versionId}`, {
          method: 'PUT',
          body: content,
        }),

      remove: (tableId: string, versionId: string) =>
        request(`${apiBase}/v1/admin/tables/${tableId}/versions/${versionId}`, { method: 'DELETE' }),

      publish: (tableId: string, versionId: string, comment = '') =>
        request<{ data: TableVersion; meta?: VersionDivergence }>(
          `${apiBase}/v1/admin/tables/${tableId}/versions/${versionId}/publish`,
          { method: 'POST', body: { comment } },
        ),

      split: (tableId: string, versionId: string, mode: SplitMode, variants: { _id: string; probability: number }[]) =>
        request<{ data: TableVersion }>(`${apiBase}/v1/admin/tables/${tableId}/versions/${versionId}/split`, {
          method: 'PUT',
          body: { variants_probability: mode, variants },
        }),

      activate: (tableId: string, versionId: string) =>
        request<{ data: DecisionTable; meta?: ActivationMeta }>(`${apiBase}/v1/admin/tables/${tableId}/activate`, {
          method: 'POST',
          body: { version_id: versionId },
        }),

      // Exécution de test d'un brouillon ou d'une version (décision marquée « test »)
      run: (tableId: string, versionId: string, body: VersionRunBody) =>
        request<{ data: unknown }>(`${apiBase}/v1/admin/tables/${tableId}/versions/${versionId}/decisions`, {
          method: 'POST',
          body,
        }),

      calls: (tableId: string) =>
        request<{ data: VersionCall[]; meta?: { window_days?: number } }>(`${apiBase}/v1/admin/tables/${tableId}/calls`),

      flows: (tableId: string) =>
        request<{ data: TableFlowUsage[] }>(`${apiBase}/v1/admin/tables/${tableId}/flows`),

      // Amène les flows à la version active de la table (publish/activate : droits dédiés)
      updateFlows: (tableId: string, body: { flow_ids?: string[]; publish?: boolean; activate?: boolean }) =>
        request<{ data: FlowUpdateResult[] }>(`${apiBase}/v1/admin/tables/${tableId}/flows/update`, {
          method: 'POST',
          body,
        }),
    },

    /**
     * Télécharge une variante de la table en classeur Excel round-trip
     * (gandalf-xlsx-v2). Sans variantId, exporte la première variante ; sans
     * versionId, la version active. Retourne le Blob + le nom de fichier
     * suggéré par le serveur.
     */
    exportExcel: async (id: string, variantId?: string, versionId?: string): Promise<{ blob: Blob; filename: string }> => {
      const authStore = useAuthStore()
      const projectsStore = useProjectsStore()
      const headers: Record<string, string> = {}
      if (authStore.accessToken && authStore.tokenType) {
        headers['Authorization'] = `${authStore.tokenType} ${authStore.accessToken}`
      }
      if (projectsStore.selectedProjectId) {
        headers['X-Application'] = projectsStore.selectedProjectId
      }
      const url = buildUrl(`${apiBase}/v1/admin/tables/${id}/export`, {
        format: 'excel',
        variant_id: variantId,
        version_id: versionId,
      })
      const response = await $fetch.raw(url, { headers, responseType: 'blob' })
      const disposition = response.headers.get('content-disposition') ?? ''
      const match = disposition.match(/filename="?([^";]+)"?/)
      return {
        blob: response._data as Blob,
        filename: match?.[1] ?? 'table.xlsx',
      }
    },

    /**
     * Importe un fichier de table (Excel round-trip → mise à jour de son origine :
     * la table, ou le brouillon d'où il a été exporté, ou un nouveau brouillon
     * pour une version publiée ; JSON/CSV/legacy → création). Le Content-Type
     * est laissé au navigateur pour que le boundary multipart soit correct.
     *
     * Réponses d'erreur à gérer côté appelant :
     *  - 409 { error: 'table_conflict', server_updated_at, file_exported_at } → proposer force
     *  - 422 { errors: [{ cell, row, column, field, message }] } → afficher la liste
     */
    importFile: async (file: File, opts: { force?: boolean; mode?: 'auto' | 'create' | 'update' } = {}): Promise<ImportResponse> => {
      const authStore = useAuthStore()
      const projectsStore = useProjectsStore()
      const headers: Record<string, string> = {}
      if (authStore.accessToken && authStore.tokenType) {
        headers['Authorization'] = `${authStore.tokenType} ${authStore.accessToken}`
      }
      if (projectsStore.selectedProjectId) {
        headers['X-Application'] = projectsStore.selectedProjectId
      }
      const form = new FormData()
      form.append('file', file)
      if (opts.force) form.append('force', '1')
      if (opts.mode) form.append('mode', opts.mode)
      return await $fetch<ImportResponse>(`${apiBase}/v1/admin/tables/import`, {
        method: 'POST',
        headers,
        body: form,
      })
    },
  }

  // ─── Flows (Decision Requirement Graph) ───────────────────────────────────

  const flows = {
    list: (size?: number, page?: number, filter?: { title?: string; category_id?: string; table_id?: string }) =>
      request<{ data: Flow[]; meta: unknown }>(`${apiBase}/v1/admin/flows`, {
        params: { size, page, ...filter },
      }),

    getById: (id: string) =>
      request<{ data: Flow }>(`${apiBase}/v1/admin/flows/${id}`),

    create: (flow: Partial<Flow>) =>
      request<{ data: Flow }>(`${apiBase}/v1/admin/flows/`, {
        method: 'POST',
        body: flow,
      }),

    update: (id: string, flow: Partial<Flow>) =>
      request<{ data: Flow }>(`${apiBase}/v1/admin/flows/${id}`, {
        method: 'PUT',
        body: flow,
      }),

    delete: (id: string) =>
      request(`${apiBase}/v1/admin/flows/${id}`, { method: 'DELETE' }),

    // Paginated run history for a flow (most recent first).
    getRuns: (id: string, size?: number, page?: number) =>
      request<{ data: FlowRun[]; meta: unknown }>(`${apiBase}/v1/admin/flows/${id}/runs`, {
        params: { size, page },
      }),

    // Versions (gandalf.api, VERSIONS.md) : comme pour les tables, sans répartition.
    versions: {
      list: (flowId: string) =>
        request<{ data: FlowVersionSummary[] }>(`${apiBase}/v1/admin/flows/${flowId}/versions`),

      get: (flowId: string, versionId: string) =>
        request<{ data: FlowVersion }>(`${apiBase}/v1/admin/flows/${flowId}/versions/${versionId}`),

      create: (flowId: string, body: { from_version_id?: string; name?: string } = {}) =>
        request<{ data: FlowVersion }>(`${apiBase}/v1/admin/flows/${flowId}/versions`, {
          method: 'POST',
          body,
        }),

      // Les clés du graphe envoyées remplacent celles du brouillon
      update: (flowId: string, versionId: string, graph: Partial<Pick<FlowVersion, 'name' | 'inputs' | 'outputs' | 'nodes' | 'edges'>>) =>
        request<{ data: FlowVersion }>(`${apiBase}/v1/admin/flows/${flowId}/versions/${versionId}`, {
          method: 'PUT',
          body: graph,
        }),

      remove: (flowId: string, versionId: string) =>
        request(`${apiBase}/v1/admin/flows/${flowId}/versions/${versionId}`, { method: 'DELETE' }),

      publish: (flowId: string, versionId: string, comment = '') =>
        request<{ data: FlowVersion; meta?: VersionDivergence }>(
          `${apiBase}/v1/admin/flows/${flowId}/versions/${versionId}/publish`,
          { method: 'POST', body: { comment } },
        ),

      activate: (flowId: string, versionId: string) =>
        request<{ data: Flow; meta?: ActivationMeta }>(`${apiBase}/v1/admin/flows/${flowId}/activate`, {
          method: 'POST',
          body: { version_id: versionId },
        }),

      // Exécution de test d'un brouillon ou d'une version (marquée « test »)
      run: (flowId: string, versionId: string, data: Record<string, unknown>) =>
        request<{ data: FlowResult }>(`${apiBase}/v1/admin/flows/${flowId}/versions/${versionId}/decisions`, {
          method: 'POST',
          body: { data },
        }),

      calls: (flowId: string) =>
        request<{ data: VersionCall[]; meta?: { window_days?: number } }>(`${apiBase}/v1/admin/flows/${flowId}/calls`),
    },

    // Execute a flow. Like every endpoint, the DRG result comes wrapped in the
    // standard { meta, data } envelope; `data` is the FlowResult
    // (flow_run_id, answer, answer_types, decision_kind, nodes).
    run: (id: string, inputs: Record<string, unknown>) =>
      request<{ data: FlowResult }>(`${apiBase}/v1/flows/${id}/decisions`, {
        method: 'POST',
        body: inputs,
      }),

    // Copy the flow (with copies of its referenced tables) into another project
    // (admin only). Source = active project (X-Application); destination in URL.
    copyTo: (id: string, projectId: string) =>
      request<{ data: Flow }>(`${apiBase}/v1/admin/flows/${id}/copyto/${projectId}`, {
        method: 'POST',
      }),

    // Move the flow to another project (admin only): it leaves the source; its
    // referenced tables are copied into the destination.
    moveTo: (id: string, projectId: string) =>
      request<{ data: Flow }>(`${apiBase}/v1/admin/flows/${id}/moveto/${projectId}`, {
        method: 'POST',
      }),
  }

  // ─── Groups ───────────────────────────────────────────────────────────────

  const groups = {
    list: (size?: number, page?: number) =>
      request<{ data: Group[] }>(`${apiBase}/v1/admin/groups`, {
        params: { size, page },
      }),

    getById: (id: string) =>
      request<{ data: Group }>(`${apiBase}/v1/admin/groups/${id}`),

    create: (group: Partial<Group>) =>
      request<{ data: Group }>(`${apiBase}/v1/admin/groups`, {
        method: 'POST',
        body: group,
      }),

    update: (id: string, group: Partial<Group>) =>
      request<{ data: Group }>(`${apiBase}/v1/admin/groups/${id}`, {
        method: 'PUT',
        body: group,
      }),

    delete: (id: string) =>
      request(`${apiBase}/v1/admin/groups/${id}`, { method: 'DELETE' }),

    copy: (id: string) =>
      request<{ data: Group }>(`${apiBase}/v1/admin/groups/${id}/copy`, {
        method: 'POST',
      }),
  }

  // ─── History / Decisions ──────────────────────────────────────────────────

  const history = {
    list: (tableId?: string, size?: number, page?: number) =>
      request<{ data: unknown[]; meta: unknown }>(`${apiBase}/v1/admin/decisions`, {
        params: { table_id: tableId, size, page },
      }),

    getById: (id: string) =>
      request<{ data: unknown }>(`${apiBase}/v1/admin/decisions/${id}`),
  }

  // ─── Consumer (debugger) ──────────────────────────────────────────────────

  const consumer = {
    send: (tableId: string, body: Record<string, unknown>) =>
      request<{ data: unknown }>(`${apiBase}/v1/tables/${tableId}/decisions`, {
        method: 'POST',
        body,
      }),

    check: (decisionId: string) =>
      request<{ data: unknown }>(`${apiBase}/v1/decisions/${decisionId}`),
  }

  // ─── Superadmin (gandalf.api, ADMIN.md) ───────────────────────────────────

  const superadmin = {
    // Journal d'administration, le plus récent d'abord
    log: (params: { application_id?: string; user_id?: string; size?: number; page?: number } = {}) =>
      request<AdminLogPage>(`${apiBase}/v1/superadmin/log`, { params }),

    // Tous les comptes, avec leurs applications ; without_application = 1 garde
    // ceux qu'aucun écran d'application n'atteint
    users: (params: { search?: string; without_application?: number; size?: number; page?: number } = {}) =>
      request<AdminAccountPage>(`${apiBase}/v1/superadmin/users`, { params }),

    // Suppression définitive : le compte quitte ses applications
    deleteUser: (userId: string) =>
      request<{ data: { _id: string; applications: { _id: string; title: string }[] } }>(
        `${apiBase}/v1/superadmin/users/${userId}`,
        { method: 'DELETE' },
      ),

    // Mot de passe temporaire, rendu une seule fois ; les sessions du compte se ferment
    resetPassword: (userId: string) =>
      request<{ data: PasswordResetResult }>(`${apiBase}/v1/superadmin/users/${userId}/password`, { method: 'POST' }),
  }

  return { auth, users, projects, categories, tables, flows, groups, history, consumer, superadmin }
}
