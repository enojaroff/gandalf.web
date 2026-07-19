import type { OAuthToken } from '~/types/api'
import type { DecisionTable } from '~/types/decision-table'
import type { Project, ProjectUser, ProjectConsumer, User, Collaborator, ConfirmCollaboratorResult } from '~/types/project'
import type { Group } from '~/types/group'
import type { Flow, FlowRun, FlowResult } from '~/types/flow'
import type { Category } from '~/types/category'

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

    if (projectsStore.selectedProjectId) {
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
      const fetchError = error as { statusCode?: number; data?: { error?: string } }

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

    delete: () => request(`${apiBase}/v1/projects`, { method: 'DELETE' }),

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

    updateUser: (user: { user_id: string; role: string; scope: string[] }) =>
      request(`${apiBase}/v1/projects/users`, { method: 'PUT', body: user }),

    removeUser: (userId: string) =>
      request(`${apiBase}/v1/projects/users`, {
        method: 'DELETE',
        body: { user_id: userId },
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
      request<{ data: DecisionTable }>(`${apiBase}/v1/admin/tables/${id}`, {
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

    /**
     * Télécharge une variante de la table en classeur Excel round-trip
     * (gandalf-xlsx-v2). Sans variantId, exporte la variante par défaut.
     * Retourne le Blob + le nom de fichier suggéré par le serveur.
     */
    exportExcel: async (id: string, variantId?: string): Promise<{ blob: Blob; filename: string }> => {
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
     * Importe un fichier de table (Excel round-trip → mise à jour de la table
     * d'origine ; JSON/CSV/legacy → création). Le Content-Type est laissé au
     * navigateur pour que le boundary multipart soit correct.
     *
     * Réponses d'erreur à gérer côté appelant :
     *  - 409 { error: 'table_conflict', server_updated_at, file_exported_at } → proposer force
     *  - 422 { errors: [{ cell, row, column, field, message }] } → afficher la liste
     */
    importFile: async (file: File, opts: { force?: boolean; mode?: 'auto' | 'create' | 'update' } = {}): Promise<{ data: DecisionTable }> => {
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
      return await $fetch<{ data: DecisionTable }>(`${apiBase}/v1/admin/tables/import`, {
        method: 'POST',
        headers,
        body: form,
      })
    },
  }

  // ─── Flows (Decision Requirement Graph) ───────────────────────────────────

  const flows = {
    list: (size?: number, page?: number, filter?: { title?: string; category_id?: string }) =>
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

  return { auth, users, projects, categories, tables, flows, groups, history, consumer }
}
