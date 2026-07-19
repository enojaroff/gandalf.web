import { defineStore } from 'pinia'
import type { Project } from '~/types/project'

interface ProjectsState {
  projects: Project[]
  selectedProjectId: string | null
  // Rôle de l'utilisateur courant dans le projet actif ('admin' | 'user' | null).
  currentUserRole: string | null
}

export const useProjectsStore = defineStore('projects', {
  state: (): ProjectsState => ({
    projects: [],
    selectedProjectId: null,
    currentUserRole: null,
  }),

  getters: {
    selectedProject: (state): Project | undefined =>
      state.projects.find(p => p._id === state.selectedProjectId),

    // Vrai si l'utilisateur est admin du projet actif (gouverne l'affichage des
    // actions admin comme copier/déplacer ; l'API reste l'autorité via son 403).
    isAdmin: (state): boolean => state.currentUserRole === 'admin',
  },

  actions: {
    async fetchAll() {
      const gandalf = useGandalf()
      const response = await gandalf.projects.list()
      this.projects = response.data

      // Si pas de projet sélectionné, sélectionner le premier
      if (!this.selectedProjectId && this.projects.length > 0) {
        this.selectedProjectId = this.projects[0]!._id
      }
      return this.projects
    },

    async fetchCurrent() {
      const gandalf = useGandalf()
      const response = await gandalf.projects.current()
      return response.data
    },

    // Charge le rôle de l'utilisateur courant dans le projet actif.
    // GET /v1/projects/users renvoie le membre applicationable courant (objet).
    async fetchCurrentUserRole() {
      const gandalf = useGandalf()
      try {
        const response = await gandalf.projects.getUsers()
        // Le backend renvoie l'objet du membre courant ; tolérer un array par sécurité.
        const member = Array.isArray(response.data) ? response.data[0] : response.data
        this.currentUserRole = (member as { role?: string } | undefined)?.role ?? null
      }
      catch {
        this.currentUserRole = null
      }
      return this.currentUserRole
    },

    selectProject(projectId: string) {
      this.selectedProjectId = projectId
      // Le rôle dépend du projet : l'invalider, il sera rechargé au besoin.
      this.currentUserRole = null
    },

    reset() {
      this.projects = []
      this.selectedProjectId = null
      this.currentUserRole = null
    },
  },

})
