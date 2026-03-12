// Middleware : redirige vers /tables si l'utilisateur est déjà connecté
export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore()

  if (authStore.isAuthenticated) {
    return navigateTo('/tables')
  }
})
