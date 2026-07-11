<template>
  <div>
    <h1 class="text-2xl font-bold text-center mb-2">{{ $t('auth.resetPassword') }}</h1>
    <p class="text-center text-muted text-sm mb-6">
      {{ $t('auth.resetPasswordSubtitle') }}
    </p>

    <UForm :schema="schema" :state="form" @submit="onSubmit">
      <UFormField :label="$t('auth.email')" name="email" class="mb-6">
        <UInput
          v-model="form.email"
          type="email"
          :placeholder="$t('auth.emailPlaceholder')"
          icon="i-lucide-mail"
          :disabled="loading || !!success"
        />
      </UFormField>

      <UAlert v-if="error" color="error" :description="error" class="mb-4" />
      <UAlert v-if="success" color="success" :description="success" class="mb-4" />

      <UButton type="submit" block :loading="loading" :disabled="!!success">
        {{ $t('auth.sendResetLink') }}
      </UButton>
    </UForm>

    <div class="mt-4 text-center text-sm">
      <NuxtLink to="/auth/sign-in" class="text-primary hover:underline">
        {{ $t('auth.backToSignIn') }}
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as v from 'valibot'

definePageMeta({ layout: 'auth', middleware: 'guest' })

const { t } = useI18n()
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
    success.value = t('auth.resetPasswordSuccess')
  }
  catch {
    error.value = t('auth.resetPasswordFailed')
  }
  finally {
    loading.value = false
  }
}
</script>
