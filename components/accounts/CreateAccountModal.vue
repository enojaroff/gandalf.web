<!-- Création directe d'un compte dans l'application (admin) : il est actif
     tout de suite, avec un mot de passe temporaire que la fenêtre parente
     affiche. Mêmes règles qu'une invitation pour le rôle et les droits.
     Avec `applications` (Administration, superadmin), l'application se choisit
     dans la fenêtre ; sinon c'est l'application sélectionnée. -->
<template>
  <UModal :open="true" @update:open="(open: boolean) => { if (!open) emit('close') }">
    <template #header>
      <h3 class="text-base font-semibold">{{ $t('settings.createAccount') }}</h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">{{ $t('settings.createAccountIntro') }}</p>

        <UFormField v-if="applications" :label="$t('admin.application')" name="application" required>
          <USelect
            v-model="applicationId"
            :items="applicationItems"
            value-key="value"
            label-key="label"
            :placeholder="$t('admin.chooseApplication')"
            :disabled="loading"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('auth.email')" name="email" required>
          <UInput v-model="form.email" type="email" autocomplete="off" placeholder="user@example.com" :disabled="loading" class="w-full" />
        </UFormField>

        <UFormField :label="$t('auth.username')" name="username" :hint="$t('common.optional')" :description="$t('settings.usernameFromEmail')">
          <UInput v-model="form.username" autocomplete="off" :disabled="loading" class="w-full" />
        </UFormField>

        <UFormField :label="$t('settings.role')" name="role">
          <USelect v-model="form.role" :items="roleItems" value-key="value" label-key="label" :disabled="loading" class="w-full" />
        </UFormField>

        <UFormField :label="$t('settings.scopes')">
          <div class="space-y-3 mt-1">
            <div v-for="group in PROJECT_USER_SCOPE_GROUPS" :key="group.id">
              <p class="text-xs font-semibold uppercase text-muted mb-1">{{ $t(scopeGroupTitleKey(group)) }}</p>
              <div class="flex flex-wrap gap-x-4 gap-y-1">
                <label v-for="item in group.scopes" :key="item.key" class="flex items-center gap-2 text-sm cursor-pointer">
                  <UCheckbox
                    :model-value="form.scope.includes(item.key)"
                    :disabled="loading"
                    @update:model-value="toggleScope(item.key, $event === true)"
                  />
                  <span>{{ $t(userScopeLabelKey(item.key)) }}</span>
                </label>
              </div>
            </div>
          </div>
        </UFormField>

        <UAlert v-if="error" color="error" :description="error" />
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end w-full">
        <UButton variant="outline" :disabled="loading" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
        <UButton icon="i-lucide-user-round-plus" :loading="loading" @click="onCreate">{{ $t('settings.createAccountSubmit') }}</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { CreatedAccount } from '~/types/project'
import { PROJECT_USER_SCOPE_GROUPS, scopeGroupTitleKey, userScopeLabelKey } from '~/utils/scopes'
import { REQUIRED_MEMBER_SCOPE, accountErrorText } from '~/utils/accountErrors'

const props = defineProps<{
  applications?: { _id: string; title: string }[]
  defaultApplicationId?: string | null
}>()
const emit = defineEmits<{ close: []; created: [account: CreatedAccount] }>()

const { t } = useI18n()
const gandalf = useGandalf()

const applicationItems = computed(() => (props.applications ?? []).map(a => ({ value: a._id, label: a.title })))
const applicationId = ref<string | undefined>(
  props.applications?.some(a => a._id === props.defaultApplicationId) ? props.defaultApplicationId ?? undefined : undefined,
)
watch(applicationId, () => { error.value = null })

// « View » des tables coché d'emblée : sans lui, le membre ne voit rien
const form = reactive({ email: '', username: '', role: 'member', scope: [REQUIRED_MEMBER_SCOPE] as string[] })
const loading = ref(false)
const error = ref<string | null>(null)
// Le message ne survit pas à une correction
watch(form, () => { error.value = null }, { deep: true })

// Seul un admin crée un compte : le rôle Admin lui est toujours proposé
const roleItems = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
]

function toggleScope(key: string, checked: boolean) {
  if (checked) {
    if (!form.scope.includes(key)) form.scope.push(key)
  }
  else {
    form.scope = form.scope.filter(s => s !== key)
  }
}

async function onCreate() {
  if (props.applications && !applicationId.value) { error.value = t('admin.chooseApplication'); return }
  if (!form.email.trim()) { error.value = t('errors.required'); return }
  if (!form.scope.includes(REQUIRED_MEMBER_SCOPE)) { error.value = t('settings.viewRequired'); return }
  loading.value = true
  try {
    const response = await gandalf.projects.createAccount({
      email: form.email.trim(),
      ...(form.username.trim() ? { username: form.username.trim() } : {}),
      role: form.role,
      scope: form.scope,
    }, applicationId.value)
    emit('created', response.data)
  }
  catch (err: unknown) {
    error.value = accountErrorText(err, t, 'settings.createAccountFailed')
  }
  finally { loading.value = false }
}
</script>
