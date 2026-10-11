<template>
  <UModal :open="true" @close="emit('close')">
    <template #header>
      <h3 class="text-base font-semibold">{{ $t('settings.inviteUser') }}</h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <UFormField :label="$t('auth.email')" name="email" required>
          <UInput v-model="form.email" type="email" placeholder="user@example.com" :disabled="loading" class="w-full" />
        </UFormField>

        <UFormField :label="$t('settings.role')" name="role">
          <USelect
            v-model="form.role"
            :items="roleItems"
            value-key="value"
            label-key="label"
            :disabled="loading"
            class="w-full"
          />
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
                    :model-value="form.scope.includes(item.key)"
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
        <UAlert v-if="success" color="success" :description="success" />
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end w-full">
        <UButton variant="outline" :disabled="loading" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
        <UButton :loading="loading" @click="onInvite">{{ $t('settings.sendInvitation') }}</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { PROJECT_USER_SCOPE_GROUPS } from '~/utils/scopes'
import { REQUIRED_MEMBER_SCOPE, accountErrorText } from '~/utils/accountErrors'

const emit = defineEmits<{ close: []; saved: [] }>()

const { t } = useI18n()
const gandalf = useGandalf()
const projectsStore = useProjectsStore()
// « View » des tables coché d'emblée : sans lui, le membre ne voit rien
const form = reactive({ email: '', role: 'member', scope: [REQUIRED_MEMBER_SCOPE] as string[] })
const loading = ref(false)
const error = ref<string | null>(null)
// Le message ne survit pas à une correction des droits
watch(() => form.scope, () => { error.value = null }, { deep: true })
const success = ref<string | null>(null)

// UCheckbox in Nuxt UI v3 is boolean-only, so toggle each scope key manually.
function toggleScope(key: string, checked: boolean) {
  if (checked) {
    if (!form.scope.includes(key)) form.scope.push(key)
  }
  else {
    form.scope = form.scope.filter(s => s !== key)
  }
}

// Seul un admin invite un admin (un superadmin agit comme un admin)
const roleItems = computed(() => [
  ...(projectsStore.isAdmin ? [{ value: 'admin', label: 'Admin' }] : []),
  { value: 'member', label: 'Member' },
])

async function onInvite() {
  if (!form.email) { error.value = t('errors.required'); return }
  if (!form.scope.includes(REQUIRED_MEMBER_SCOPE)) { error.value = t('settings.viewRequired'); return }
  loading.value = true; error.value = null
  try {
    await gandalf.projects.inviteUser({ email: form.email, role: form.role, scope: form.scope })
    success.value = t('settings.invitationSent')
    emit('saved')
    setTimeout(() => emit('close'), 1500)
  }
  catch (err: unknown) {
    error.value = accountErrorText(err, t, 'settings.invitationFailed')
  }
  finally { loading.value = false }
}
</script>
