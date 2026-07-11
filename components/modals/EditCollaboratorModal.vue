<template>
  <UModal :open="true" @close="emit('close')">
    <template #header>
      <h3 class="text-base font-semibold">{{ $t('settings.editCollaborator') }}</h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="flex gap-2 text-sm">
          <span class="font-semibold w-24">{{ $t('settings.username') }}</span>
          <span>{{ collaborator.username || '—' }}</span>
        </div>
        <div class="flex gap-2 text-sm">
          <span class="font-semibold w-24">{{ $t('auth.email') }}</span>
          <span>{{ collaborator.email || '—' }}</span>
        </div>

        <UFormField :label="$t('settings.role')">
          <UInput :model-value="collaborator.role" disabled class="w-full" />
        </UFormField>

        <UFormField :label="$t('settings.scopes')">
          <div class="space-y-3 mt-1">
            <div v-for="group in PROJECT_USER_SCOPE_GROUPS" :key="group.title">
              <p class="text-xs font-semibold uppercase text-muted mb-1">{{ group.title }}</p>
              <div class="flex flex-wrap gap-x-4 gap-y-1">
                <label
                  v-for="item in group.scopes"
                  :key="item.key"
                  class="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <UCheckbox
                    :model-value="scope.includes(item.key)"
                    :disabled="loading"
                    @update:model-value="toggleScope(item.key, $event)"
                  />
                  <span>{{ item.label }}</span>
                </label>
              </div>
            </div>
          </div>
        </UFormField>

        <UAlert v-if="error" color="error" :description="error" />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between items-center w-full">
        <div class="flex gap-2">
          <UButton variant="outline" color="error" icon="i-lucide-user-minus" :disabled="loading" @click="onRemove">
            {{ $t('settings.removeFromProject') }}
          </UButton>
          <UButton variant="soft" color="error" icon="i-lucide-trash-2" :disabled="loading" @click="onDeleteAccount">
            {{ $t('settings.deleteAccount') }}
          </UButton>
        </div>
        <div class="flex gap-2">
          <UButton variant="outline" :disabled="loading" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
          <UButton :loading="loading" @click="onSave">{{ $t('common.save') }}</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { PROJECT_USER_SCOPE_GROUPS } from '~/utils/scopes'
import type { Collaborator } from '~/types/project'

const props = defineProps<{ collaborator: Collaborator }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { t } = useI18n()
const gandalf = useGandalf()
const toast = useToast()

// Local copy of the collaborator's scopes so edits are not applied until Save.
const scope = ref<string[]>([...props.collaborator.scope])
const loading = ref(false)
const error = ref<string | null>(null)

// UCheckbox in Nuxt UI v3 is boolean-only (no array binding), so toggle each
// scope key in/out of the array manually.
function toggleScope(key: string, checked: boolean) {
  if (checked) {
    if (!scope.value.includes(key)) scope.value.push(key)
  }
  else {
    scope.value = scope.value.filter(s => s !== key)
  }
}

async function onSave() {
  if (!props.collaborator.user_id) return
  loading.value = true
  error.value = null
  try {
    await gandalf.projects.updateUser({
      user_id: props.collaborator.user_id,
      role: props.collaborator.role,
      scope: scope.value,
    })
    toast.add({ title: t('settings.collaboratorUpdated'), color: 'success' })
    emit('saved')
    emit('close')
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = e?.data?.message || t('errors.failedToSave')
  }
  finally { loading.value = false }
}

async function onRemove() {
  if (!props.collaborator.user_id) return
  if (!confirm(t('settings.removeUser'))) return
  loading.value = true
  error.value = null
  try {
    await gandalf.projects.removeUser(props.collaborator.user_id)
    toast.add({ title: t('settings.collaboratorRemoved'), color: 'success' })
    emit('saved')
    emit('close')
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = e?.data?.message || t('errors.failedToSave')
  }
  finally { loading.value = false }
}

async function onDeleteAccount() {
  if (!props.collaborator.user_id) return

  // Double confirmation: the admin must type the exact email to proceed, since
  // this permanently deletes the account (not just removes it from the project).
  const email = props.collaborator.email || ''
  const typed = window.prompt(t('settings.deleteAccountConfirm', { email }))
  if (typed === null) return
  if (typed.trim() !== email) {
    error.value = t('settings.deleteAccountMismatch')
    return
  }

  loading.value = true
  error.value = null
  try {
    await gandalf.projects.deleteAccount(props.collaborator.user_id)
    toast.add({ title: t('settings.accountDeleted'), color: 'success' })
    emit('saved')
    emit('close')
  }
  catch (err: unknown) {
    // 409: the account belongs to other projects — show which ones.
    const e = err as { statusCode?: number; data?: { data?: { message?: string; projects?: Array<{ title: string }> }; message?: string } }
    const conflict = e?.data?.data
    if (e?.statusCode === 409 && conflict?.projects?.length) {
      const names = conflict.projects.map(p => p.title).join(', ')
      error.value = t('settings.deleteAccountBlocked', { projects: names })
    }
    else {
      error.value = conflict?.message || e?.data?.message || t('errors.failedToSave')
    }
  }
  finally { loading.value = false }
}
</script>
