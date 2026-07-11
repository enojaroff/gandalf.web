<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('settings.title') }}</h1>

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-primary" />
    </div>

    <template v-else>
      <!-- Infos projet -->
      <UCard class="mb-6 shadow-md shadow-blue-500/50">
        <template #header>
          <h3 class="font-semibold">{{ $t('settings.projectDetails') }}</h3>
        </template>
        <UForm :state="projectForm" @submit="saveProject">
          <UFormField :label="$t('settings.projectName')" name="title" class="mb-4">
            <UInput v-model="projectForm.title" :disabled="savingProject" class="inline-full" />
          </UFormField>
          <UFormField :label="$t('common.description')" name="description" class="mb-4">
            <UTextarea v-model="projectForm.description" :rows="3" :disabled="savingProject" class="inline-full" />
          </UFormField>
          <UAlert v-if="projectError" color="error" :description="projectError" class="mb-3" />
          <UAlert v-if="projectSuccess" color="success" :description="projectSuccess" class="mb-3" />
          <div class="flex gap-2 justify-end">
            <UButton type="submit" :loading="savingProject">{{ $t('common.save') }}</UButton>
          </div>
        </UForm>
      </UCard>

      <!-- Utilisateurs -->
      <UCard class="mb-6 shadow-lg shadow-blue-500/50">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">{{ $t('settings.users') }}</h3>
            <UButton size="sm" icon="i-heroicons-plus" variant="outline" @click="showInviteUser = true">
              {{ $t('settings.invite') }}
            </UButton>
          </div>
        </template>
        <div v-if="loadingUsers" class="py-4 text-center text-muted">{{ $t('common.loading') }}</div>
        <UTable v-else :data="users" :columns="userColumns">
          <template #scope-cell="{ row }">
            <div class="flex flex-wrap gap-1">
              <UBadge v-for="s in row.original.scope" :key="s" size="xs" variant="soft">{{ s }}</UBadge>
            </div>
          </template>
          <template #actions-cell="{ row }">
            <UButton variant="ghost" icon="i-heroicons-trash" size="sm" color="error" @click="removeUser(row.original)" />
          </template>
        </UTable>
      </UCard>

      <!-- Consommateurs API -->
      <UCard class="shadow-md">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">{{ $t('settings.consumers') }}</h3>
            <UButton size="sm" icon="i-heroicons-plus" variant="outline" @click="showAddConsumer = true">
              {{ $t('settings.add') }}
            </UButton>
          </div>
        </template>
        <div v-if="loadingConsumers" class="py-4 text-center text-muted">{{ $t('common.loading') }}</div>
        <UTable v-else :data="consumers" :columns="consumerColumns">
          <template #scope-cell="{ row }">
            <div class="flex flex-wrap gap-1">
              <UBadge v-for="s in row.original.scope" :key="s" size="xs" variant="soft">{{ s }}</UBadge>
            </div>
          </template>
          <template #actions-cell="{ row }">
            <UButton variant="ghost" icon="i-heroicons-trash" size="sm" color="error" @click="removeConsumer(row.original)" />
          </template>
        </UTable>
      </UCard>
    </template>

    <!-- Modales -->
    <InviteUserModal v-if="showInviteUser" @close="showInviteUser = false" @saved="loadUsers" />
    <AddConsumerModal v-if="showAddConsumer" @close="showAddConsumer = false" @saved="loadConsumers" />
  </div>
</template>

<script setup lang="ts">
import type { ProjectUser, ProjectConsumer } from '~/types/project'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const gandalf = useGandalf()
const projectsStore = useProjectsStore()

const loading = ref(false)
const loadingUsers = ref(false)
const loadingConsumers = ref(false)
const savingProject = ref(false)
const projectError = ref<string | null>(null)
const projectSuccess = ref<string | null>(null)
const showInviteUser = ref(false)
const showAddConsumer = ref(false)

const projectForm = reactive({ title: '', description: '' })
const users = ref<ProjectUser[]>([])
const consumers = ref<ProjectConsumer[]>([])

const userColumns = computed(() => [
  { accessorKey: 'email', header: t('auth.email') },
  { accessorKey: 'role', header: t('settings.role') },
  { accessorKey: 'scope', header: t('settings.scopes') },
  { id: 'actions', header: '' },
])

const consumerColumns = computed(() => [
  { accessorKey: 'client_id', header: t('settings.clientId') },
  { accessorKey: 'description', header: t('common.description') },
  { accessorKey: 'scope', header: t('settings.scopes') },
  { id: 'actions', header: '' },
])

onMounted(async () => {
  loading.value = true
  try {
    const project = await gandalf.projects.current()
    projectForm.title = project.data.title
    projectForm.description = project.data.description || ''
    await Promise.all([loadUsers(), loadConsumers()])
  }
  finally { loading.value = false }
})

async function loadUsers() {
  loadingUsers.value = true
  try {
    const resp = await gandalf.projects.getUsers()
    users.value = resp.data
  }
  finally { loadingUsers.value = false }
}

async function loadConsumers() {
  loadingConsumers.value = true
  try {
    const resp = await gandalf.projects.getConsumers()
    consumers.value = resp.data
  }
  finally { loadingConsumers.value = false }
}

async function saveProject() {
  savingProject.value = true
  projectError.value = null
  projectSuccess.value = null
  try {
    await gandalf.projects.update({ title: projectForm.title, description: projectForm.description })
    await projectsStore.fetchAll()
    projectSuccess.value = t('settings.projectUpdated')
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    projectError.value = e?.data?.message || t('errors.failedToSave')
  }
  finally { savingProject.value = false }
}

async function removeUser(user: ProjectUser) {
  if (!confirm(t('settings.removeUser'))) return
  try {
    await gandalf.projects.removeUser(user.user_id)
    await loadUsers()
  }
  catch { /* TODO toast */ }
}

async function removeConsumer(consumer: ProjectConsumer) {
  if (!confirm(t('settings.removeConsumer'))) return
  try {
    await gandalf.projects.removeConsumer(consumer.client_id)
    await loadConsumers()
  }
  catch { /* TODO toast */ }
}
</script>
