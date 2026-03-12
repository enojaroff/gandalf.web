<template>
  <div>
    <h1 class="text-2xl font-bold text-center mb-6">Sign In</h1>

    <UForm :schema="schema" :state="form" @submit="onSubmit">
      <UFormField label="Username" name="username" class="mb-4">
        <UInput
          v-model="form.username"
          placeholder="Your username"
          icon="i-heroicons-user"
          autocomplete="username"
          :disabled="loading"
        />
      </UFormField>

      <UFormField label="Password" name="password" class="mb-6">
        <UInput
          v-model="form.password"
          type="password"
          placeholder="Your password"
          icon="i-heroicons-lock-closed"
          autocomplete="current-password"
          :disabled="loading"
        />
      </UFormField>

      <UAlert v-if="error" color="error" :description="error" class="mb-4" />

      <UButton type="submit" block :loading="loading">
        Sign In
      </UButton>
    </UForm>

    <div class="mt-4 text-center text-sm space-y-2">
      <div>
        <NuxtLink to="/auth/reset-password" class="text-primary hover:underline">
          Forgot password?
        </NuxtLink>
      </div>
      <div>
        Don't have an account?
        <NuxtLink to="/auth/sign-up" class="text-primary hover:underline">
          Sign up
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as v from 'valibot'

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const route = useRoute()

const form = reactive({
  username: (route.query.username as string) || '',
  password: '',
})

const schema = v.object({
  username: v.pipe(v.string(), v.minLength(1, 'Username is required')),
  password: v.pipe(v.string(), v.minLength(1, 'Password is required')),
})

const loading = ref(false)
const error = ref<string | null>(null)

async function onSubmit() {
  loading.value = true
  error.value = null

  try {
    await authStore.signIn(form.username, form.password)
    console.error('[SIGNIN] After signIn, token:', authStore.accessToken?.substring(0, 8) ?? 'NULL', '| isAuth:', authStore.isAuthenticated)
    await projectsStore.fetchAll()

    // Redirection vers welcome si pas encore de projet
    if (projectsStore.projects.length === 0) {
      await navigateTo('/welcome')
    } else {
      await navigateTo('/tables')
    }
  }
  catch (err: unknown) {
    const fetchError = err as { data?: { message?: string; error?: string } }
    error.value =
      fetchError?.data?.message
      || fetchError?.data?.error
      || 'Invalid credentials. Please try again.'
  }
  finally {
    loading.value = false
  }
}
</script>
