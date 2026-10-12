<!-- Administration des superadmins (gandalf.api, ADMIN.md) : toutes les
     applications, leurs admins, leur suppression ; tous les comptes ; le journal
     des actions des superadmins. L'API reste l'autorité (403 pour un autre
     utilisateur). -->
<template>
  <div>
    <div v-if="!ready" class="flex justify-center py-12">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
    </div>

    <UAlert v-else-if="!userStore.isSuperadmin" color="warning" icon="i-lucide-shield-alert" :title="$t('admin.superadminOnly')" />

    <template v-else>
      <div class="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 class="text-2xl font-bold">{{ $t('admin.title') }}</h1>
          <p class="text-sm text-muted">{{ $t('admin.intro') }}</p>
        </div>
        <UButton icon="i-lucide-plus" to="/settings/project/create" class="shrink-0">
          {{ $t('settings.createApplication.title') }}
        </UButton>
      </div>

      <UTabs v-model="tab" :items="tabItems" :content="false" class="mb-4" />

      <!-- Applications -->
      <UCard v-if="tab === 'applications'">
        <div v-if="!applications.length" class="text-center py-8 text-muted">{{ $t('admin.noApplication') }}</div>
        <UTable v-else :data="applications" :columns="applicationColumns">
          <template #title-cell="{ row }">
            <div class="min-w-0">
              <div class="font-medium truncate">{{ row.original.title }}</div>
              <div v-if="row.original.description" class="text-xs text-muted truncate max-w-xs">{{ row.original.description }}</div>
            </div>
          </template>
          <template #admins-cell="{ row }">
            <div v-if="applicationAdmins(row.original).length" class="flex flex-col">
              <span v-for="admin in applicationAdmins(row.original)" :key="admin" class="text-sm">{{ admin }}</span>
            </div>
            <UBadge v-else color="warning" variant="subtle" size="sm" :title="$t('admin.noAdminHint')">{{ $t('admin.noAdmin') }}</UBadge>
          </template>
          <template #members-cell="{ row }">
            {{ row.original.users?.length ?? 0 }}
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-1">
              <UButton icon="i-lucide-log-in" size="xs" variant="ghost" :title="$t('admin.open')" @click="open(row.original, '/tables')" />
              <UButton icon="i-lucide-users" size="xs" variant="ghost" :title="$t('admin.settings')" @click="open(row.original, '/settings/project')" />
              <UButton icon="i-lucide-scroll-text" size="xs" variant="ghost" :title="$t('admin.showLog')" @click="showLog(row.original._id)" />
              <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" :title="$t('admin.delete')" @click="() => { deleting = row.original }" />
            </div>
          </template>
        </UTable>
      </UCard>

      <!-- Comptes -->
      <AccountsTab v-else-if="tab === 'accounts'" :applications="applications" @changed="reloadApplications" />

      <!-- Journal -->
      <UCard v-else>
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <p class="text-sm text-muted">{{ $t('admin.logIntro') }}</p>
            <USelect
              v-model="logApplication"
              :items="logApplicationItems"
              value-key="value"
              label-key="label"
              class="w-64 shrink-0"
              size="sm"
            />
          </div>
        </template>
        <div v-if="logLoading" class="flex justify-center py-8">
          <UIcon name="i-lucide-refresh-cw" class="animate-spin text-2xl text-primary" />
        </div>
        <div v-else-if="!logEntries.length" class="text-center py-8 text-muted">{{ $t('admin.logEmpty') }}</div>
        <UTable v-else :data="logEntries" :columns="logColumns">
          <template #date-cell="{ row }">
            <span class="text-muted whitespace-nowrap">{{ formatDate(row.original.created_at) }}</span>
          </template>
          <template #user-cell="{ row }">
            {{ row.original.email || $t('admin.logCommand') }}
          </template>
          <template #action-cell="{ row }">
            <code v-if="'text' in logEntryLabel(row.original)" class="text-xs">{{ labelText(row.original) }}</code>
            <span v-else>{{ labelText(row.original) }}</span>
            <div v-if="row.original.details.title" class="text-xs text-muted">{{ row.original.details.title }}</div>
          </template>
          <template #application-cell="{ row }">
            <span class="text-muted">{{ applicationTitle(row.original.application_id ?? row.original.details.application_id) }}</span>
          </template>
          <template #status-cell="{ row }">
            <UBadge v-if="row.original.status" :color="logStatusColor(row.original.status)" variant="subtle" size="sm">
              {{ row.original.status }}
            </UBadge>
          </template>
        </UTable>
        <div v-if="logTotal > logSize" class="flex justify-end mt-4">
          <UPagination :page="logPage" :items-per-page="logSize" :total="logTotal" @update:page="(p: number) => { logPage = p }" />
        </div>
      </UCard>
    </template>

    <DeleteApplicationModal v-if="deleting" :project="deleting" @deleted="onDeleted" @close="deleting = null" />
  </div>
</template>

<script setup lang="ts">
import type { AdminLogEntry } from '~/types/admin'
import type { Project } from '~/types/project'
import DeleteApplicationModal from '~/components/admin/DeleteApplicationModal.vue'
import AccountsTab from '~/components/admin/AccountsTab.vue'
import { applicationAdmins, logEntryLabel, logStatusColor } from '~/utils/superadmin'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const toast = useToast()
const gandalf = useGandalf()
const userStore = useUserStore()
const projectsStore = useProjectsStore()

const ready = ref(false)
const tab = ref<'applications' | 'accounts' | 'log'>('applications')
const applications = ref<Project[]>([])
const deleting = ref<Project | null>(null)

const logEntries = ref<AdminLogEntry[]>([])
const logLoading = ref(false)
// 'all' : toutes les applications (un item de USelect ne peut pas valoir '')
const logApplication = ref<string>('all')
const logPage = ref(1)
const logSize = 50
const logTotal = ref(0)

const tabItems = computed(() => [
  { label: t('admin.applications'), value: 'applications', icon: 'i-lucide-boxes' },
  { label: t('admin.accounts'), value: 'accounts', icon: 'i-lucide-users' },
  { label: t('admin.log'), value: 'log', icon: 'i-lucide-scroll-text' },
])

const applicationColumns = computed(() => [
  { id: 'title', header: t('admin.application') },
  { id: 'admins', header: t('admin.admins') },
  { id: 'members', header: t('admin.members') },
  { id: 'actions', header: '' },
])

const logColumns = computed(() => [
  { id: 'date', header: t('admin.logDate') },
  { id: 'user', header: t('admin.logUser') },
  { id: 'action', header: t('admin.logAction') },
  { id: 'application', header: t('admin.application') },
  { id: 'status', header: t('admin.logStatus') },
])

const logApplicationItems = computed(() => [
  { label: t('admin.allApplications'), value: 'all' },
  ...applications.value.map(a => ({ label: a.title, value: a._id })),
])

onMounted(async () => {
  try {
    if (!userStore.currentUser) await userStore.fetchCurrent()
    if (userStore.isSuperadmin) await loadApplications()
  }
  catch {
    toast.add({ title: t('errors.failedToLoad'), color: 'error' })
  }
  finally {
    ready.value = true
  }
})

async function loadApplications() {
  const response = await gandalf.projects.list()
  applications.value = response.data
}

async function loadLog() {
  logLoading.value = true
  try {
    const response = await gandalf.superadmin.log({
      application_id: logApplication.value === 'all' ? undefined : logApplication.value,
      size: logSize,
      page: logPage.value,
    })
    logEntries.value = response.data
    logTotal.value = response.paging?.total ?? response.data.length
  }
  catch {
    toast.add({ title: t('errors.failedToLoad'), color: 'error' })
  }
  finally {
    logLoading.value = false
  }
}

watch(tab, (value) => { if (value === 'log') loadLog() })
watch(logApplication, () => {
  logPage.value = 1
  loadLog()
})
watch(logPage, () => loadLog())

function showLog(applicationId: string) {
  logApplication.value = applicationId
  tab.value = 'log'
}

// Agir dans l'application : la sélectionner, comme le sélecteur de l'en-tête
function open(project: Project, path: string) {
  projectsStore.selectProject(project._id)
  navigateTo(path)
}

// Après une création ou une suppression : un échec du rechargement se signale
async function reloadApplications() {
  try {
    await loadApplications()
  }
  catch {
    toast.add({ title: t('errors.failedToLoad'), color: 'error' })
  }
}

async function onDeleted(projectId: string) {
  const title = deleting.value?.title ?? ''
  deleting.value = null
  toast.add({ title: t('admin.deleted', { title }), color: 'success' })
  if (projectsStore.selectedProjectId === projectId) projectsStore.selectedProjectId = null
  try {
    await Promise.all([loadApplications(), projectsStore.fetchAll()])
  }
  catch {
    toast.add({ title: t('errors.failedToLoad'), color: 'error' })
  }
}

function applicationTitle(applicationId: string | null | undefined): string {
  if (!applicationId) return '—'
  return applications.value.find(a => a._id === applicationId)?.title ?? applicationId
}

function labelText(entry: AdminLogEntry): string {
  const label = logEntryLabel(entry)
  return 'text' in label ? label.text : t(label.key, label.params)
}

function formatDate(value: string): string {
  const date = new Date(value)
  return isNaN(date.getTime()) ? value : date.toLocaleString()
}
</script>
