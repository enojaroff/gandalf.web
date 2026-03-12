<template>
  <UModal :open="true" @close="emit('close')">
    <template #header>
      <h3 class="text-base font-semibold">Edit Profile</h3>
    </template>

    <div class="space-y-4">
      <UFormField label="Username" name="username">
        <UInput v-model="form.username" :disabled="loading" />
      </UFormField>
      <UFormField label="First Name" name="first_name">
        <UInput v-model="form.first_name" :disabled="loading" />
      </UFormField>
      <UFormField label="Last Name" name="last_name">
        <UInput v-model="form.last_name" :disabled="loading" />
      </UFormField>
      <UFormField label="Email" name="email">
        <UInput v-model="form.email" type="email" :disabled="loading" />
      </UFormField>
      <UFormField label="Current Password" name="current_password" required>
        <UInput v-model="form.current_password" type="password" :disabled="loading" />
      </UFormField>

      <UAlert v-if="error" color="error" :description="error" />
      <UAlert v-if="success" color="success" :description="success" />
    </div>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton variant="outline" :disabled="loading" @click="emit('close')">Cancel</UButton>
        <UButton :loading="loading" @click="onSave">Save</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const emit = defineEmits<{ close: []; saved: [] }>()

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
  if (!form.current_password) { error.value = 'Current password is required.'; return }
  loading.value = true; error.value = null
  try {
    await userStore.update({ ...form })
    success.value = 'Profile updated!'
    emit('saved')
    setTimeout(() => emit('close'), 1500)
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = e?.data?.message || 'Failed to update profile.'
  }
  finally { loading.value = false }
}
</script>
