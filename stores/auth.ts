import { defineStore } from 'pinia'
import type { OAuthToken } from '~/types/api'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  tokenType: string | null
  expiresIn: number | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null,
    refreshToken: null,
    tokenType: null,
    expiresIn: null,
  }),

  getters: {
    isAuthenticated: (state): boolean => !!state.accessToken,
  },

  actions: {
    setToken(token: Partial<OAuthToken>) {
      this.accessToken = token.access_token ?? null
      this.refreshToken = token.refresh_token ?? null
      this.tokenType = token.token_type ?? null
      this.expiresIn = token.expires_in ?? null
    },

    async signIn(username: string, password: string) {
      const gandalf = useGandalf()
      const raw = await gandalf.auth.signIn(username, password)
      const response = typeof raw === 'string' ? JSON.parse(raw) : raw
      this.setToken(response)
      return response
    },

    async signUp(username: string, password: string, email: string) {
      const gandalf = useGandalf()
      return gandalf.auth.signUp({ username, password, email })
    },

    logout() {
      this.accessToken = null
      this.refreshToken = null
      this.tokenType = null
      this.expiresIn = null

      // Vider également le store projets
      const projectsStore = useProjectsStore()
      projectsStore.reset()
    },
  },

})
