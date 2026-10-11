// Mot de passe temporaire : rien d'autre que la page de changement tant qu'il
// n'est pas remplacé. L'API reste l'autorité (403 password_change_required,
// intercepté aussi par useGandalf) ; ceci évite d'afficher des pages vides.
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()
  const userStore = useUserStore()

  if (!authStore.isAuthenticated || userStore.currentUser?.must_change_password !== true) return
  if (to.path.endsWith('/auth/change-password')) return

  return navigateTo('/auth/change-password')
})
