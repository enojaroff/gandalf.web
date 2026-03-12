// Middleware : redirige vers /auth/sign-in si l'utilisateur n'est pas connecté
export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated) {
    return navigateTo('/auth/sign-in')
  }
})
