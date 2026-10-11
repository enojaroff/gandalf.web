import { defineStore } from 'pinia'
import type { User } from '~/types/project'

interface UserState {
  currentUser: User | null
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    currentUser: null,
  }),

  getters: {
    // Superadmin Claims IA (gandalf.api, ADMIN.md) : seul à créer et supprimer
    // des applications. L'API reste l'autorité (403).
    isSuperadmin: (state): boolean => state.currentUser?.superadmin === true,
  },

  actions: {
    async fetchCurrent() {
      const gandalf = useGandalf()
      const response = await gandalf.users.current()
      this.currentUser = response.data
      return this.currentUser
    },

    async update(data: Partial<User> & { current_password?: string; password?: string }) {
      const gandalf = useGandalf()
      const response = await gandalf.users.update(data)
      this.currentUser = response.data
      return this.currentUser
    },

    async verifyEmail(token: string) {
      const gandalf = useGandalf()
      return gandalf.auth.verifyEmail(token)
    },

    reset() {
      this.currentUser = null
    },
  },
})
