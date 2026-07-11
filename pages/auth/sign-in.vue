<template>
  <div>
    <h1 class="text-2xl font-bold text-center mb-6">{{ $t('auth.signInTitle') }}</h1>

    <UForm :schema="schema" :state="form" @submit="onSubmit">
      <UFormField :label="$t('auth.username')" name="username" class="mb-4">
        <UInput
          v-model="form.username"
          :placeholder="$t('auth.usernamePlaceholder')"
          icon="i-lucide-user"
          autocomplete="username"
          :disabled="loading"
        />
      </UFormField>

      <UFormField :label="$t('auth.password')" name="password" class="mb-6">
        <UInput
          v-model="form.password"
          type="password"
          :placeholder="$t('auth.passwordPlaceholder')"
          icon="i-lucide-lock"
          autocomplete="current-password"
          :disabled="loading"
        />
      </UFormField>

      <UAlert v-if="error" color="error" :description="error" class="mb-4" />

      <UButton type="submit" block :loading="loading">
        {{ $t('auth.signIn') }}
      </UButton>
    </UForm>

    <div class="mt-4 text-center text-sm space-y-2">
      <div>
        <NuxtLink to="/auth/reset-password" class="text-primary hover:underline">
          {{ $t('auth.forgotPassword') }}
        </NuxtLink>
      </div>
      <div>
        {{ $t('auth.noAccount') }}
        <NuxtLink to="/auth/sign-up" class="text-primary hover:underline">
          {{ $t('auth.signUpLink') }}
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

const { t } = useI18n()
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

  // Step 1 — authenticate. Only failures here mean invalid credentials.
  try {
    await authStore.signIn(form.username, form.password)
  }
  catch (err: unknown) {
    const fetchError = err as { data?: { message?: string; error?: string } }
    error.value =
      fetchError?.data?.message
      || fetchError?.data?.error
      || t('auth.invalidCredentials')
    loading.value = false
    return
  }

  // Step 2 — the user is authenticated. Loading projects or redirecting may
  // still fail (e.g. a 500 from the API), but that is NOT a credentials error,
  // so surface a distinct message instead of "invalid credentials".
  try {
    await projectsStore.fetchAll()

    if (projectsStore.projects.length === 0) {
      await navigateTo('/welcome')
    }
    else {
      await navigateTo('/tables')
    }
  }
  catch (err: unknown) {
    const fetchError = err as { data?: { message?: string; error?: string } }
    error.value =
      fetchError?.data?.message
      || fetchError?.data?.error
      || t('auth.loadProjectsFailed')
  }
  finally {
    loading.value = false
  }
}
</script>
