import { defineStore } from 'pinia'
import type { Project } from '~/types/project'

interface ProjectsState {
  projects: Project[]
  selectedProjectId: string | null
}

export const useProjectsStore = defineStore('projects', {
  state: (): ProjectsState => ({
    projects: [],
    selectedProjectId: null,
  }),

  getters: {
    selectedProject: (state): Project | undefined =>
      state.projects.find(p => p._id === state.selectedProjectId),
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

    selectProject(projectId: string) {
      this.selectedProjectId = projectId
    },

    reset() {
      this.projects = []
      this.selectedProjectId = null
    },
  },

})
