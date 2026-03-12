// Restore auth token and selected project from localStorage on app init (client-side only)
export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()
  const projectsStore = useProjectsStore()

  // Restore auth from localStorage
  const storedAuth = localStorage.getItem('auth')
  if (storedAuth) {
    try {
      const data = JSON.parse(storedAuth)
      if (data.accessToken) {
        authStore.accessToken = data.accessToken
        authStore.refreshToken = data.refreshToken
        authStore.tokenType = data.tokenType
        authStore.expiresIn = data.expiresIn
      }
    }
    catch { /* ignore */ }
  }

  // Restore selected project from localStorage
  const storedProjectId = localStorage.getItem('selectedProjectId')
  if (storedProjectId) {
    projectsStore.selectedProjectId = storedProjectId
  }

  // Persist auth on every token change
  watch(
    () => authStore.accessToken,
    () => {
      if (authStore.accessToken) {
        localStorage.setItem('auth', JSON.stringify({
          accessToken: authStore.accessToken,
          refreshToken: authStore.refreshToken,
          tokenType: authStore.tokenType,
          expiresIn: authStore.expiresIn,
        }))
      }
      else {
        localStorage.removeItem('auth')
      }
    },
  )

  // Persist selected project on change
  watch(
    () => projectsStore.selectedProjectId,
    (id) => {
      if (id) localStorage.setItem('selectedProjectId', id)
      else localStorage.removeItem('selectedProjectId')
    },
  )
})
