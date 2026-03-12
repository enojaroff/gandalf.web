<template>
  <div class="text-center">
    <div v-if="loading">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-primary mb-4" />
      <p>Activating your account…</p>
    </div>

    <div v-else-if="success">
      <UIcon name="i-heroicons-check-circle" class="text-4xl text-green-500 mb-4" />
      <h2 class="text-xl font-bold mb-2">Account activated!</h2>
      <p class="text-muted mb-4">Your account is now active. You can sign in.</p>
      <UButton to="/auth/sign-in">Go to Sign In</UButton>
    </div>

    <div v-else>
      <UIcon name="i-heroicons-x-circle" class="text-4xl text-red-500 mb-4" />
      <h2 class="text-xl font-bold mb-2">Activation failed</h2>
      <p class="text-muted mb-4">{{ error }}</p>
      <UButton to="/auth/sign-in" variant="outline">Back to Sign In</UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const userStore = useUserStore()

const loading = ref(true)
const success = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    await userStore.verifyEmail(route.params.token as string)
    success.value = true
  }
  catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Invalid or expired activation token.'
  }
  finally {
    loading.value = false
  }
})
</script>
