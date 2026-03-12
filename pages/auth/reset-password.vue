<template>
  <div>
    <h1 class="text-2xl font-bold text-center mb-2">Reset Password</h1>
    <p class="text-center text-muted text-sm mb-6">
      Enter your email and we'll send you a reset link.
    </p>

    <UForm :schema="schema" :state="form" @submit="onSubmit">
      <UFormField label="Email" name="email" class="mb-6">
        <UInput
          v-model="form.email"
          type="email"
          placeholder="Your email address"
          icon="i-heroicons-envelope"
          :disabled="loading || !!success"
        />
      </UFormField>

      <UAlert v-if="error" color="error" :description="error" class="mb-4" />
      <UAlert v-if="success" color="success" :description="success" class="mb-4" />

      <UButton type="submit" block :loading="loading" :disabled="!!success">
        Send Reset Link
      </UButton>
    </UForm>

    <div class="mt-4 text-center text-sm">
      <NuxtLink to="/auth/sign-in" class="text-primary hover:underline">
        Back to Sign In
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as v from 'valibot'

definePageMeta({ layout: 'auth', middleware: 'guest' })

const form = reactive({ email: '' })

const schema = v.object({
  email: v.pipe(v.string(), v.email('Invalid email address')),
})

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

async function onSubmit() {
  loading.value = true
  error.value = null

  try {
    const gandalf = useGandalf()
    await gandalf.auth.resetPassword(form.email)
    success.value = 'If this email exists, you will receive a reset link shortly.'
  }
  catch {
    error.value = 'Failed to send reset email. Please try again.'
  }
  finally {
    loading.value = false
  }
}
</script>
