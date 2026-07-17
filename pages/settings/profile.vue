<!-- Page profil de l'utilisateur connecté : édition username / nom / email,
     protégée par un mot de passe actuel. Accessible via le menu utilisateur
     (route /settings/profile). -->
<template>
  <div class="max-w-xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <UButton to="/" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <h1 class="text-2xl font-bold">{{ $t('auth.editProfileTitle') }}</h1>
    </div>

    <div v-if="loadingUser" class="flex justify-center py-12">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
    </div>

    <UCard v-else>
      <UForm :state="form" @submit="onSave">
        <UFormField :label="$t('auth.username')" name="username" class="mb-4">
          <UInput v-model="form.username" :disabled="saving" class="inline-full" />
        </UFormField>
        <UFormField :label="$t('auth.firstName')" name="first_name" class="mb-4">
          <UInput v-model="form.first_name" :disabled="saving" class="inline-full" />
        </UFormField>
        <UFormField :label="$t('auth.lastName')" name="last_name" class="mb-4">
          <UInput v-model="form.last_name" :disabled="saving" class="inline-full" />
        </UFormField>
        <UFormField :label="$t('auth.email')" name="email" class="mb-4">
          <UInput v-model="form.email" type="email" :disabled="saving" class="inline-full" />
        </UFormField>
        <UFormField :label="$t('auth.currentPassword')" name="current_password" class="mb-4" required>
          <UInput v-model="form.current_password" type="password" :disabled="saving" class="inline-full" />
        </UFormField>

        <UAlert v-if="error" color="error" :description="error" class="mb-4" />
        <UAlert v-if="success" color="success" :description="success" class="mb-4" />

        <div class="flex gap-3 justify-end">
          <UButton to="/" variant="outline" :disabled="saving">{{ $t('common.cancel') }}</UButton>
          <UButton type="submit" :loading="saving">{{ $t('common.save') }}</UButton>
        </div>
      </UForm>
    </UCard>

    <!-- UI preferences: no current-password needed, saved on its own. -->
    <UCard v-if="!loadingUser" class="mt-6">
      <template #header>
        <h2 class="font-semibold">{{ $t('profile.preferences') }}</h2>
      </template>

      <UFormField
        :label="$t('flows.inputMode')"
        :description="$t('flows.inputModeHelp')"
        name="flow_input_mode"
        class="mb-4"
      >
        <UButtonGroup>
          <UButton
            icon="i-lucide-mouse"
            :variant="flowInputMode === 'mouse' ? 'solid' : 'outline'"
            :disabled="savingPrefs"
            @click="() => { flowInputMode = 'mouse' }"
          >
            {{ $t('flows.inputModeMouse') }}
          </UButton>
          <UButton
            icon="i-lucide-square-mouse-pointer"
            :variant="flowInputMode === 'trackpad' ? 'solid' : 'outline'"
            :disabled="savingPrefs"
            @click="() => { flowInputMode = 'trackpad' }"
          >
            {{ $t('flows.inputModeTrackpad') }}
          </UButton>
        </UButtonGroup>
      </UFormField>

      <UAlert v-if="prefsError" color="error" :description="prefsError" class="mb-4" />
      <UAlert v-if="prefsSuccess" color="success" :description="prefsSuccess" class="mb-4" />

      <div class="flex justify-end">
        <UButton :loading="savingPrefs" @click="savePreferences">{{ $t('common.save') }}</UButton>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ path: '/settings/profile', middleware: 'auth' })

const { t } = useI18n()
const userStore = useUserStore()

const form = reactive({
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  current_password: '',
})
const loadingUser = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

// UI preferences (saved separately from the profile — no password required).
const flowInputMode = ref<'mouse' | 'trackpad'>('mouse')
const savingPrefs = ref(false)
const prefsError = ref<string | null>(null)
const prefsSuccess = ref<string | null>(null)

// Seed the form from currentUser (fetching it if the page was opened directly
// by URL, before the user menu populated the store).
function seedForm() {
  const u = userStore.currentUser
  form.username = u?.username || ''
  form.first_name = u?.first_name || ''
  form.last_name = u?.last_name || ''
  form.email = u?.email || ''
  flowInputMode.value = u?.settings?.flow_input_mode === 'trackpad' ? 'trackpad' : 'mouse'
}

onMounted(async () => {
  if (!userStore.currentUser) {
    loadingUser.value = true
    try {
      await userStore.fetchCurrent()
    }
    catch {
      error.value = t('errors.failedToLoad')
    }
    finally {
      loadingUser.value = false
    }
  }
  seedForm()
})

async function onSave() {
  if (!form.current_password) {
    error.value = t('auth.currentPasswordRequired')
    return
  }
  saving.value = true
  error.value = null
  success.value = null
  try {
    await userStore.update({ ...form })
    success.value = t('auth.profileUpdated')
    form.current_password = ''
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = e?.data?.message || t('auth.profileUpdateFailed')
  }
  finally {
    saving.value = false
  }
}

// Save UI preferences on their own — sends only `settings`, so no current
// password is required. Merges into any existing settings to preserve other
// (future) preferences.
async function savePreferences() {
  savingPrefs.value = true
  prefsError.value = null
  prefsSuccess.value = null
  try {
    const settings = { ...userStore.currentUser?.settings, flow_input_mode: flowInputMode.value }
    await userStore.update({ settings })
    prefsSuccess.value = t('profile.preferencesSaved')
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    prefsError.value = e?.data?.message || t('errors.failedToSave')
  }
  finally {
    savingPrefs.value = false
  }
}
</script>
