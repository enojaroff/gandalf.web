<template>
  <div>
    <h1 class="text-2xl font-bold text-center mb-6">Set New Password</h1>

    <UForm :schema="schema" :state="form" @submit="onSubmit">
      <UFormField label="New Password" name="password" class="mb-4">
        <UInput
          v-model="form.password"
          type="password"
          placeholder="New password"
          icon="i-heroicons-lock-closed"
          autocomplete="new-password"
          :disabled="loading"
        />
      </UFormField>

      <UFormField label="Confirm Password" name="confirm" class="mb-6">
        <UInput
          v-model="form.confirm"
          type="password"
          placeholder="Confirm new password"
          icon="i-heroicons-lock-closed"
          autocomplete="new-password"
          :disabled="loading"
        />
      </UFormField>

      <UAlert v-if="error" color="error" :description="error" class="mb-4" />
      <UAlert v-if="success" color="success" :description="success" class="mb-4" />

      <UButton type="submit" block :loading="loading" :disabled="!!success">
        Reset Password
      </UButton>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import * as v from 'valibot'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const token = route.query.token as string

const form = reactive({ password: '', confirm: '' })

const schema = v.object({
  password: v.pipe(v.string(), v.minLength(8, 'At least 8 characters')),
  confirm: v.pipe(v.string(), v.minLength(1, 'Please confirm your password')),
})

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

async function onSubmit() {
  if (form.password !== form.confirm) {
    error.value = 'Passwords do not match.'
    return
  }

  loading.value = true
  error.value = null

  try {
    const gandalf = useGandalf()
    await gandalf.auth.resetPasswordConfirm(token, form.password)
    success.value = 'Password updated! You can now sign in.'
  }
  catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Reset failed. The link may be expired.'
  }
  finally {
    loading.value = false
  }
}
</script>
