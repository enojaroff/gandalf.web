<template>
  <UModal :open="true" @close="emit('close')">
    <template #header>
      <h3 class="text-base font-semibold">{{ $t('auth.editProfileTitle') }}</h3>
    </template>

    <div class="space-y-4">
      <UFormField :label="$t('auth.username')" name="username">
        <UInput v-model="form.username" :disabled="loading" />
      </UFormField>
      <UFormField :label="$t('auth.firstName')" name="first_name">
        <UInput v-model="form.first_name" :disabled="loading" />
      </UFormField>
      <UFormField :label="$t('auth.lastName')" name="last_name">
        <UInput v-model="form.last_name" :disabled="loading" />
      </UFormField>
      <UFormField :label="$t('auth.email')" name="email">
        <UInput v-model="form.email" type="email" :disabled="loading" />
      </UFormField>
      <UFormField :label="$t('auth.currentPassword')" name="current_password" required>
        <UInput v-model="form.current_password" type="password" :disabled="loading" />
      </UFormField>

      <UAlert v-if="error" color="error" :description="error" />
      <UAlert v-if="success" color="success" :description="success" />
    </div>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton variant="outline" :disabled="loading" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
        <UButton :loading="loading" @click="onSave">{{ $t('common.save') }}</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const emit = defineEmits<{ close: []; saved: [] }>()

const { t } = useI18n()
const userStore = useUserStore()

const form = reactive({
  username: userStore.currentUser?.username || '',
  first_name: userStore.currentUser?.first_name || '',
  last_name: userStore.currentUser?.last_name || '',
  email: userStore.currentUser?.email || '',
  current_password: '',
})
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

async function onSave() {
  if (!form.current_password) { error.value = t('auth.currentPasswordRequired'); return }
  loading.value = true; error.value = null
  try {
    await userStore.update({ ...form })
    success.value = t('auth.profileUpdated')
    emit('saved')
    setTimeout(() => emit('close'), 1500)
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = e?.data?.message || t('auth.profileUpdateFailed')
  }
  finally { loading.value = false }
}
</script>
