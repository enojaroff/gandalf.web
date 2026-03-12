<template>
  <div>
    <h1 class="text-2xl font-bold text-center mb-6">Create Account</h1>

    <UForm :schema="schema" :state="form" @submit="onSubmit">
      <UFormField label="Username" name="username" class="mb-4">
        <UInput
          v-model="form.username"
          placeholder="Choose a username"
          icon="i-heroicons-user"
          autocomplete="username"
          :disabled="loading"
        />
      </UFormField>

      <UFormField label="Email" name="email" class="mb-4">
        <UInput
          v-model="form.email"
          type="email"
          placeholder="Your email address"
          icon="i-heroicons-envelope"
          autocomplete="email"
          :disabled="loading"
        />
      </UFormField>

      <UFormField label="Password" name="password" class="mb-4">
        <UInput
          v-model="form.password"
          type="password"
          placeholder="Create a password"
          icon="i-heroicons-lock-closed"
          autocomplete="new-password"
          :disabled="loading"
        />
        <!-- Indicateur de force du mot de passe -->
        <div v-if="form.password" class="mt-2">
          <div class="flex gap-1">
            <div
              v-for="i in 4"
              :key="i"
              class="h-1 flex-1 rounded-full"
              :class="i <= passwordStrength.score ? strengthColor : 'bg-gray-200'"
            />
          </div>
          <p class="text-xs mt-1" :class="strengthTextColor">
            {{ passwordStrength.feedback }}
          </p>
        </div>
      </UFormField>

      <UAlert v-if="error" color="error" :description="error" class="mb-4" />
      <UAlert v-if="success" color="success" :description="success" class="mb-4" />

      <UButton type="submit" block :loading="loading" :disabled="!!success">
        Create Account
      </UButton>
    </UForm>

    <div class="mt-4 text-center text-sm">
      Already have an account?
      <NuxtLink to="/auth/sign-in" class="text-primary hover:underline">
        Sign in
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as v from 'valibot'
import zxcvbn from 'zxcvbn'

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const route = useRoute()
const authStore = useAuthStore()

const form = reactive({
  username: (route.query.username as string) || '',
  email: (route.query.email as string) || '',
  password: '',
})

const schema = v.object({
  username: v.pipe(v.string(), v.minLength(3, 'At least 3 characters')),
  email: v.pipe(v.string(), v.email('Invalid email address')),
  password: v.pipe(v.string(), v.minLength(8, 'At least 8 characters')),
})

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const passwordStrength = computed(() => {
  if (!form.password) return { score: 0, feedback: '' }
  const result = zxcvbn(form.password)
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong']
  return {
    score: result.score + 1,
    feedback: labels[result.score] || '',
  }
})

const strengthColor = computed(() => {
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600']
  return colors[passwordStrength.value.score - 1] || 'bg-gray-200'
})

const strengthTextColor = computed(() => {
  const score = passwordStrength.value.score
  if (score <= 2) return 'text-red-500'
  if (score === 3) return 'text-yellow-600'
  return 'text-green-600'
})

async function onSubmit() {
  loading.value = true
  error.value = null

  try {
    await authStore.signUp(form.username, form.password, form.email)
    success.value = 'Account created! Please check your email to activate your account.'
  }
  catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Registration failed. Please try again.'
  }
  finally {
    loading.value = false
  }
}
</script>
