<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

// Redirige vers /tables si connecté, sinon vers /auth/sign-in
const authStore = useAuthStore()
if (authStore.isAuthenticated) {
  await navigateTo('/tables')
} else {
  await navigateTo('/auth/sign-in')
}
</script>
