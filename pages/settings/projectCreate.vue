<template>
  <div class="max-w-xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <UButton to="/settings/project" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <h1 class="text-2xl font-bold">{{ $t('settings.createApplication.title') }}</h1>
    </div>

    <div v-if="!ready" class="flex justify-center py-12">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
    </div>

    <!-- Seul un superadmin crée une application (gandalf.api, ADMIN.md) -->
    <UAlert v-else-if="!userStore.isSuperadmin" color="info" icon="i-lucide-info" :description="$t('settings.createApplication.superadminOnly')" />

    <UCard v-else>
      <UForm :state="form" @submit="onSubmit">
        <UFormField :label="$t('settings.createApplication.nameLabel')" name="title" class="mb-4" required>
          <UInput
            v-model="form.title"
            :placeholder="$t('settings.createApplication.namePlaceholder')"
            :disabled="loading"
            class="inline-full"
          />
        </UFormField>

        <UFormField :label="$t('common.description')" name="description" class="mb-4">
          <UTextarea
            v-model="form.description"
            :placeholder="$t('settings.createApplication.descriptionPlaceholder')"
            :rows="3"
            :disabled="loading"
            class="inline-full"
          />
        </UFormField>

        <!-- Le superadmin n'est pas membre de l'application créée : il nomme son admin -->
        <UFormField
          :label="$t('settings.createApplication.adminEmail')"
          :hint="$t('common.optional')"
          :help="$t('settings.createApplication.adminEmailHelp')"
          name="adminEmail"
          class="mb-6"
        >
          <UInput v-model="form.adminEmail" type="email" placeholder="admin@client.fr" :disabled="loading" class="inline-full" />
        </UFormField>

        <UAlert v-if="error" color="error" :description="error" class="mb-4" />

        <div class="flex gap-3 justify-end">
          <UButton to="/settings/project" variant="outline" :disabled="loading">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton type="submit" :loading="loading">
            {{ $t('common.create') }}
          </UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ProjectUser } from '~/types/project'

definePageMeta({ path: '/settings/project/create', middleware: 'auth' })

const { t } = useI18n()
const toast = useToast()
const gandalf = useGandalf()
const projectsStore = useProjectsStore()
const userStore = useUserStore()

const form = reactive({ title: '', description: '', adminEmail: '' })
const ready = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    if (!userStore.currentUser) await userStore.fetchCurrent()
  }
  finally {
    ready.value = true
  }
})

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function onSubmit() {
  if (!form.title.trim()) {
    error.value = t('errors.required')
    return
  }
  const adminEmail = form.adminEmail.trim()
  if (adminEmail && !EMAIL.test(adminEmail)) {
    error.value = t('errors.invalidEmail')
    return
  }

  loading.value = true
  error.value = null

  let created = false
  try {
    const resp = await gandalf.projects.create({ title: form.title, description: form.description })
    created = true
    await projectsStore.fetchAll()
    projectsStore.selectProject(resp.data._id)

    if (adminEmail) {
      // L'admin reçoit les droits du superadmin dans l'application, c'est-à-dire tous
      const me = await gandalf.projects.getUsers()
      const entry = (Array.isArray(me.data) ? me.data[0] : me.data) as ProjectUser | undefined
      await gandalf.projects.inviteUser({ email: adminEmail, role: 'admin', scope: entry?.scope ?? [] })
      toast.add({ title: t('settings.createApplication.adminInvited', { email: adminEmail }), color: 'success' })
    }
    // Les collaborateurs : l'invitation à confirmer, ou l'admin à inviter
    await navigateTo('/settings/project')
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = created
      ? t('settings.createApplication.inviteFailed')
      : e?.data?.message || t('errors.failedToCreate')
  }
  finally {
    loading.value = false
  }
}
</script>
