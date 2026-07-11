<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('settings.title') }}</h1>

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
    </div>

    <template v-else>
      <!-- Infos projet -->
      <UCard class="mb-6 shadow-md">
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
      <UCard class="mb-6 shadow-md">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">{{ $t('settings.users') }}</h3>
            <div class="flex gap-2">
              <UButton size="sm" icon="i-lucide-user-plus" variant="outline" @click="showAddUser = true">
                {{ $t('settings.addExistingUser') }}
              </UButton>
              <UButton size="sm" icon="i-lucide-mail" variant="outline" @click="showInviteUser = true">
                {{ $t('settings.invite') }}
              </UButton>
            </div>
          </div>
        </template>
        <div v-if="loadingUsers" class="py-4 text-center text-muted">{{ $t('common.loading') }}</div>
        <UTable v-else :data="users" :columns="userColumns">
          <template #status-cell="{ row }">
            <UBadge :color="statusColor(row.original.status)" size="xs" variant="soft">
              {{ statusLabel(row.original.status) }}
            </UBadge>
          </template>
          <template #scope-cell="{ row }">
            <div class="flex flex-wrap gap-1">
              <UBadge v-for="s in row.original.scope" :key="s" size="xs" variant="soft">{{ s }}</UBadge>
            </div>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-1">
              <!-- Confirm: pending users and invitations -->
              <UButton
                v-if="row.original.status !== 'active'"
                variant="soft"
                icon="i-lucide-check"
                size="sm"
                color="success"
                :loading="confirmingKey === collaboratorKey(row.original)"
                @click="confirmCollaborator(row.original)"
              >
                {{ $t('settings.confirm') }}
              </UButton>
              <!-- Invitations: resend + cancel -->
              <UButton
                v-if="row.original.status === 'invited'"
                variant="ghost"
                icon="i-lucide-mail"
                size="sm"
                :loading="busyKey === collaboratorKey(row.original)"
                :title="$t('settings.resendInvite')"
                @click="resendInvitation(row.original)"
              />
              <UButton
                v-if="row.original.status === 'invited'"
                variant="ghost"
                icon="i-lucide-x"
                size="sm"
                color="error"
                :title="$t('settings.cancelInvite')"
                @click="cancelInvitation(row.original)"
              />
              <!-- Registered collaborators: edit (contains Remove) -->
              <UButton
                v-if="row.original.user_id"
                variant="ghost"
                icon="i-lucide-pencil"
                size="sm"
                :title="$t('common.edit')"
                @click="editCollaborator(row.original)"
              />
            </div>
          </template>
        </UTable>
      </UCard>

      <!-- Consommateurs API -->
      <UCard class="shadow-md">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">{{ $t('settings.consumers') }}</h3>
            <UButton size="sm" icon="i-lucide-plus" variant="outline" @click="showAddConsumer = true">
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
            <UButton variant="ghost" icon="i-lucide-trash-2" size="sm" color="error" @click="removeConsumer(row.original)" />
          </template>
        </UTable>
      </UCard>
    </template>

    <!-- Modales -->
    <AddCollaboratorModal v-if="showAddUser" @close="showAddUser = false" @saved="loadUsers" />
    <InviteUserModal v-if="showInviteUser" @close="showInviteUser = false" @saved="loadUsers" />
    <AddConsumerModal v-if="showAddConsumer" @close="showAddConsumer = false" @saved="loadConsumers" />
    <EditCollaboratorModal
      v-if="editing"
      :collaborator="editing"
      @close="editing = null"
      @saved="loadUsers"
    />

    <!-- Mot de passe temporaire (après confirmation d'une invitation) -->
    <UModal v-model:open="showTempPassword">
      <template #header>
        <h3 class="text-base font-semibold">{{ $t('settings.tempPasswordTitle') }}</h3>
      </template>
      <template #body>
        <p class="mb-4 text-sm text-muted">{{ $t('settings.tempPasswordMessage') }}</p>
        <div class="flex items-center gap-2">
          <UInput :model-value="tempPassword" readonly class="flex-1 font-mono" />
          <UButton
            :icon="tempPasswordCopied ? 'i-lucide-check' : 'i-lucide-copy'"
            variant="outline"
            @click="copyTempPassword"
          >
            {{ tempPasswordCopied ? $t('settings.tempPasswordCopied') : $t('settings.tempPasswordCopy') }}
          </UButton>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end w-full">
          <UButton @click="showTempPassword = false">{{ $t('common.close') }}</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Collaborator, CollaboratorStatus, ProjectConsumer } from '~/types/project'
// Explicit imports: these live under components/modals/, which Nuxt auto-imports
// as <ModalsInviteUserModal>/<ModalsAddConsumerModal>. The template uses the
// unprefixed names, so import them here to resolve them reliably.
import InviteUserModal from '~/components/modals/InviteUserModal.vue'
import AddConsumerModal from '~/components/modals/AddConsumerModal.vue'
import EditCollaboratorModal from '~/components/modals/EditCollaboratorModal.vue'
import AddCollaboratorModal from '~/components/modals/AddCollaboratorModal.vue'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const gandalf = useGandalf()
const toast = useToast()
const projectsStore = useProjectsStore()

const loading = ref(false)
const loadingUsers = ref(false)
const loadingConsumers = ref(false)
const savingProject = ref(false)
const projectError = ref<string | null>(null)
const projectSuccess = ref<string | null>(null)
const showInviteUser = ref(false)
const showAddUser = ref(false)
const showAddConsumer = ref(false)

const projectForm = reactive({ title: '', description: '' })
const users = ref<Collaborator[]>([])
const consumers = ref<ProjectConsumer[]>([])

// Temp-password modal shown after confirming an invitation
const showTempPassword = ref(false)
const tempPassword = ref('')
const tempPasswordCopied = ref(false)
// Key of the collaborator whose confirmation is in flight (for per-row loading)
const confirmingKey = ref<string | null>(null)
// Key of the invitation whose cancel/resend is in flight
const busyKey = ref<string | null>(null)
// Collaborator currently being edited (drives the edit modal)
const editing = ref<Collaborator | null>(null)

const userColumns = computed(() => [
  { accessorKey: 'email', header: t('auth.email') },
  { accessorKey: 'role', header: t('settings.role') },
  { accessorKey: 'status', header: t('settings.status') },
  { accessorKey: 'scope', header: t('settings.scopes') },
  { id: 'actions', header: '' },
])

function collaboratorKey(c: Collaborator): string {
  return c.user_id || `invite:${c.email}`
}

function statusLabel(status: CollaboratorStatus): string {
  return {
    active: t('settings.statusActive'),
    pending: t('settings.statusPending'),
    invited: t('settings.statusInvited'),
  }[status]
}

function statusColor(status: CollaboratorStatus): 'success' | 'warning' | 'neutral' {
  return { active: 'success', pending: 'warning', invited: 'neutral' }[status] as
    'success' | 'warning' | 'neutral'
}

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
    const resp = await gandalf.projects.getCollaborators()
    users.value = resp.data
  }
  finally { loadingUsers.value = false }
}

async function confirmCollaborator(collaborator: Collaborator) {
  if (!confirm(t('settings.confirmUserMessage'))) return
  confirmingKey.value = collaboratorKey(collaborator)
  try {
    // Pending users are confirmed by user_id; invitations by email.
    const payload = collaborator.user_id
      ? { user_id: collaborator.user_id }
      : { email: collaborator.email as string }
    const resp = await gandalf.projects.confirmCollaborator(payload)

    // An invitation confirmation returns a temporary password to show the admin.
    if (resp.data.temporary_password) {
      tempPassword.value = resp.data.temporary_password
      tempPasswordCopied.value = false
      showTempPassword.value = true
    }
    else {
      toast.add({ title: t('settings.confirmUserSuccess'), color: 'success' })
    }
    await loadUsers()
  }
  catch {
    toast.add({ title: t('settings.confirmUserFailed'), color: 'error' })
  }
  finally { confirmingKey.value = null }
}

function editCollaborator(collaborator: Collaborator) {
  editing.value = collaborator
}

async function resendInvitation(collaborator: Collaborator) {
  if (!collaborator.email) return
  busyKey.value = collaboratorKey(collaborator)
  try {
    await gandalf.projects.resendInvitation(collaborator.email)
    toast.add({ title: t('settings.inviteResent'), color: 'success' })
  }
  catch {
    toast.add({ title: t('settings.invitationFailed'), color: 'error' })
  }
  finally { busyKey.value = null }
}

async function cancelInvitation(collaborator: Collaborator) {
  if (!collaborator.email) return
  if (!confirm(t('settings.cancelInviteConfirm'))) return
  busyKey.value = collaboratorKey(collaborator)
  try {
    await gandalf.projects.cancelInvitation(collaborator.email)
    toast.add({ title: t('settings.inviteCancelled'), color: 'success' })
    await loadUsers()
  }
  catch {
    toast.add({ title: t('errors.failedToSave'), color: 'error' })
  }
  finally { busyKey.value = null }
}

async function copyTempPassword() {
  try {
    await navigator.clipboard.writeText(tempPassword.value)
    tempPasswordCopied.value = true
  }
  catch { /* clipboard unavailable */ }
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

async function removeUser(user: Collaborator) {
  // Only registered collaborators can be removed (invitations have no user_id).
  if (!user.user_id) return
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
