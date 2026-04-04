<template>
  <UModal :open="true" @close="emit('close')">
    <template #header>
      <h3 class="text-base font-semibold">{{ $t('settings.inviteUser') }}</h3>
    </template>

    <div class="space-y-4">
      <UFormField :label="$t('auth.email')" name="email" required>
        <UInput v-model="form.email" type="email" placeholder="user@example.com" :disabled="loading" />
      </UFormField>

      <UFormField :label="$t('settings.role')" name="role">
        <USelect
          v-model="form.role"
          :items="[{ value: 'admin', label: 'Admin' }, { value: 'member', label: 'Member' }]"
          value-key="value"
          label-key="label"
          :disabled="loading"
        />
      </UFormField>

      <UFormField :label="$t('settings.scopes')">
        <div class="grid grid-cols-2 gap-2 mt-1">
          <label
            v-for="scope in PROJECT_USER_SCOPES"
            :key="scope"
            class="flex items-center gap-2 text-sm cursor-pointer"
          >
            <UCheckbox v-model="form.scope" :value="scope" :disabled="loading" />
            <span>{{ scope }}</span>
          </label>
        </div>
      </UFormField>

      <UAlert v-if="error" color="error" :description="error" />
      <UAlert v-if="success" color="success" :description="success" />
    </div>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton variant="outline" :disabled="loading" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
        <UButton :loading="loading" @click="onInvite">{{ $t('settings.sendInvitation') }}</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { PROJECT_USER_SCOPES } from '~/utils/scopes'

const emit = defineEmits<{ close: []; saved: [] }>()

const { t } = useI18n()
const gandalf = useGandalf()
const form = reactive({ email: '', role: 'member', scope: [] as string[] })
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

async function onInvite() {
  if (!form.email) { error.value = t('errors.required'); return }
  loading.value = true; error.value = null
  try {
    await gandalf.projects.inviteUser({ email: form.email, role: form.role, scope: form.scope })
    success.value = t('settings.invitationSent')
    emit('saved')
    setTimeout(() => emit('close'), 1500)
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = e?.data?.message || t('settings.invitationFailed')
  }
  finally { loading.value = false }
}
</script>
