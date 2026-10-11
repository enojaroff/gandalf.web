<!-- Changement de mot de passe par la personne connectée (PUT /users/current,
     mot de passe actuel requis). `temporary` : le mot de passe actuel est un
     mot de passe temporaire, à remplacer avant tout le reste. -->
<template>
  <UForm :state="form" @submit="onSubmit">
    <UFormField :label="temporary ? $t('auth.temporaryPassword') : $t('auth.currentPassword')" name="current_password" class="mb-4" required>
      <UInput v-model="form.current" type="password" autocomplete="current-password" :disabled="saving" class="w-full" />
    </UFormField>
    <UFormField :label="$t('auth.newPassword')" name="password" :description="$t('auth.passwordRules')" class="mb-4" required>
      <UInput v-model="form.password" type="password" autocomplete="new-password" :disabled="saving" class="w-full" />
    </UFormField>
    <UFormField :label="$t('auth.confirmPassword')" name="confirm" class="mb-4" required>
      <UInput v-model="form.confirm" type="password" autocomplete="new-password" :disabled="saving" class="w-full" />
    </UFormField>

    <UAlert v-if="error" color="error" :description="error" class="mb-4" />

    <div class="flex gap-3 justify-end">
      <slot name="actions" :saving="saving" />
      <UButton type="submit" :loading="saving">{{ $t('auth.changePasswordSubmit') }}</UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { passwordProblem } from '~/utils/passwordRules'
import { apiValidationMessages } from '~/utils/apiErrors'

defineProps<{ temporary?: boolean }>()
const emit = defineEmits<{ done: [] }>()

const { t } = useI18n()
const userStore = useUserStore()

const form = reactive({ current: '', password: '', confirm: '' })
const saving = ref(false)
const error = ref<string | null>(null)
watch(form, () => { error.value = null })

// Messages de validation de l'API (resources/lang/en/validation.php) traduits
const API_MESSAGES: Record<string, string> = {
  'Incorrect password': 'auth.currentPasswordWrong',
  'Password must contain characters in the lower and upper case and integer': 'auth.passwordClasses',
  'The password must be between 6 and 32 characters.': 'auth.passwordTooLong',
}

async function onSubmit() {
  if (!form.current) { error.value = t('auth.currentPasswordRequired'); return }
  const problem = passwordProblem(form.password)
  if (problem) { error.value = t(problem); return }
  if (form.password !== form.confirm) { error.value = t('auth.passwordMismatch'); return }
  if (form.password === form.current) { error.value = t('auth.passwordUnchanged'); return }

  saving.value = true
  try {
    await userStore.update({ current_password: form.current, password: form.password })
    form.current = form.password = form.confirm = ''
    emit('done')
  }
  catch (err: unknown) {
    const messages = apiValidationMessages(err)
    error.value = messages.length
      ? [...new Set(messages.map(m => (API_MESSAGES[m] ? t(API_MESSAGES[m]) : m)))].join(' ')
      : t('auth.changePasswordFailed')
  }
  finally { saving.value = false }
}
</script>
