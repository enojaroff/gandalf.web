<!-- Onglet "Versions" d'une table de décision (gandalf.api, VERSIONS.md) :
     brouillons et versions publiées, version active, et les actions de leur
     cycle de vie. Les actions n'apparaissent qu'avec le droit correspondant ;
     l'API reste l'autorité (403). -->
<template>
  <div>
    <UBreadcrumb :items="breadcrumbs" class="mb-4" />

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
    </div>

    <template v-else-if="table">
      <div class="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 class="text-2xl font-bold">{{ table.title }}</h1>
          <p class="text-sm text-muted">{{ $t('versions.intro') }}</p>
        </div>
        <UButton v-if="can('tables_update')" icon="i-lucide-file-plus" @click="() => { draftFrom = { label: activeLabel } }">
          {{ $t('versions.newDraft') }}
        </UButton>
      </div>

      <TableNav :table-id="tableId" />

      <UCard class="mb-6">
        <div v-if="!versions.length" class="text-center py-8 text-muted">{{ $t('versions.empty') }}</div>
        <UTable v-else :data="versions" :columns="columns">
          <template #version-cell="{ row }">
            <div class="flex items-center gap-2">
              <span v-if="versionNumberLabel(row.original)" class="font-semibold">{{ versionNumberLabel(row.original) }}</span>
              <UBadge v-if="row.original.is_active" color="success" variant="subtle" size="sm">{{ $t('versions.active') }}</UBadge>
              <UBadge v-else-if="row.original.status === 'draft'" color="warning" variant="subtle" size="sm">{{ $t('versions.draft') }}</UBadge>
            </div>
          </template>
          <template #name-cell="{ row }">
            <div class="min-w-0">
              <div class="truncate">{{ row.original.name || row.original.comment || '—' }}</div>
              <div v-if="row.original.name && row.original.comment" class="text-xs text-muted truncate">{{ row.original.comment }}</div>
              <div v-if="row.original.autopublished" class="text-xs text-muted">{{ $t('versions.autopublished') }}</div>
            </div>
          </template>
          <template #origin-cell="{ row }">
            <span class="text-muted">{{ originLabel(row.original) }}</span>
          </template>
          <template #date-cell="{ row }">
            <span class="text-muted">{{ formatDate(row.original.published_at || row.original.updated_at) }}</span>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-1">
              <UButton
                v-if="row.original.status === 'draft' && can('tables_update')"
                icon="i-lucide-pencil"
                size="xs"
                variant="ghost"
                :title="$t('versions.edit')"
                :to="editLink(row.original)"
              />
              <UButton
                icon="i-lucide-flask-conical"
                size="xs"
                variant="ghost"
                :title="$t('versions.test')"
                :to="`/tables/${tableId}/debug?version=${row.original._id}`"
              />
              <UButton
                v-if="row.original.status === 'draft' && can('tables_publish')"
                icon="i-lucide-stamp"
                size="xs"
                variant="ghost"
                :title="$t('versions.publish')"
                @click="() => { publishing = row.original }"
              />
              <UButton
                v-if="row.original.status === 'published' && !row.original.is_active && can('tables_activate')"
                icon="i-lucide-rocket"
                size="xs"
                variant="ghost"
                :title="$t('versions.activate')"
                @click="() => { activating = row.original }"
              />
              <UButton
                v-if="canSplit(row.original)"
                icon="i-lucide-split"
                size="xs"
                variant="ghost"
                :title="$t('versions.split')"
                @click="() => { splitting = row.original }"
              />
              <UButton
                v-if="row.original.status === 'published' && can('tables_update')"
                icon="i-lucide-file-plus"
                size="xs"
                variant="ghost"
                :title="$t('versions.newDraftFrom')"
                @click="() => { draftFrom = { id: row.original._id, label: versionNumberLabel(row.original) ?? '' } }"
              />
              <UButton
                icon="i-lucide-download"
                size="xs"
                variant="ghost"
                :title="$t('tables.exportExcel')"
                @click="excel.exportExcel(tableId, undefined, row.original._id)"
              />
              <UButton
                v-if="canDelete(row.original)"
                icon="i-lucide-trash-2"
                size="xs"
                color="error"
                variant="ghost"
                :title="$t('common.delete')"
                @click="remove(row.original)"
              />
            </div>
          </template>
        </UTable>
      </UCard>

      <!-- Clés d'API qui appellent la table, par version demandée -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">{{ $t('versions.callsTitle', { days: windowDays }) }}</h3>
        </template>
        <div v-if="!calls.length" class="text-center py-6 text-muted">{{ $t('versions.noCalls') }}</div>
        <UTable v-else :data="calls" :columns="callColumns">
          <template #consumer-cell="{ row }">
            {{ row.original.description || row.original.consumer }}
          </template>
          <template #requested_version-cell="{ row }">
            {{ row.original.requested_version === null ? $t('versions.callsWithout') : `v${row.original.requested_version}` }}
          </template>
          <template #last_call_at-cell="{ row }">
            {{ formatDate(row.original.last_call_at) }}
          </template>
        </UTable>
      </UCard>
    </template>

    <VersionDraftModal
      v-if="draftFrom"
      :table-id="tableId"
      :from-version-id="draftFrom.id"
      :from-label="draftFrom.label"
      @created="onDraftCreated"
      @close="draftFrom = null"
    />
    <VersionPublishModal
      v-if="publishing"
      :table-id="tableId"
      :draft="publishing"
      :diverging="divergence(publishing, versions)"
      @published="onPublished"
      @close="publishing = null"
    />
    <VersionActivateModal
      v-if="activating"
      :table-id="tableId"
      :version="activating"
      :diverging="divergence(activating, versions)"
      @activated="reload"
      @close="activating = null"
    />
    <VersionSplitModal
      v-if="splitting"
      :table-id="tableId"
      :version="splitting"
      @saved="onSplitSaved"
      @close="splitting = null"
    />
  </div>
</template>

<script setup lang="ts">
import type { DecisionTable } from '~/types/decision-table'
import type { TableVersion, TableVersionSummary, VersionCall } from '~/types/version'
import VersionDraftModal from '~/components/versions/VersionDraftModal.vue'
import VersionPublishModal from '~/components/versions/VersionPublishModal.vue'
import VersionActivateModal from '~/components/versions/VersionActivateModal.vue'
import VersionSplitModal from '~/components/versions/VersionSplitModal.vue'
import { apiErrorCode } from '~/utils/apiErrors'
import { divergence, sortVersions, versionNumberLabel } from '~/utils/versions'

definePageMeta({ path: '/tables/:id/versions', middleware: 'auth' })

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const gandalf = useGandalf()
const projectsStore = useProjectsStore()
const excel = useTableExcel()

const tableId = route.params.id as string
const table = ref<DecisionTable | null>(null)
const versions = ref<TableVersionSummary[]>([])
const calls = ref<VersionCall[]>([])
const windowDays = ref(30)
const loading = ref(true)

const draftFrom = ref<{ id?: string; label: string } | null>(null)
const publishing = ref<TableVersionSummary | null>(null)
const activating = ref<TableVersionSummary | null>(null)
const splitting = ref<TableVersionSummary | null>(null)

const can = (scope: string) => projectsStore.can(scope)

const activeLabel = computed(() => {
  const active = versions.value.find(v => v.is_active)
  return active ? versionNumberLabel(active) ?? '' : ''
})

const breadcrumbs = computed(() => [
  { label: t('nav.tables'), to: '/tables' },
  { label: table.value?.title || tableId, to: `/tables/${tableId}/info` },
  { label: t('versions.title') },
])

const columns = computed(() => [
  { id: 'version', header: t('versions.version') },
  { id: 'name', header: t('versions.nameComment') },
  { id: 'origin', header: t('versions.origin') },
  { id: 'date', header: t('versions.date') },
  { id: 'actions', header: '' },
])

const callColumns = computed(() => [
  { accessorKey: 'consumer', header: t('versions.callsKey') },
  { accessorKey: 'requested_version', header: t('versions.callsVersion') },
  { accessorKey: 'count', header: t('versions.callsCount') },
  { accessorKey: 'last_call_at', header: t('versions.callsLast') },
])

onMounted(async () => {
  if (projectsStore.currentUserScopes === null) projectsStore.fetchCurrentUserRole()
  try {
    await reload()
  }
  finally { loading.value = false }
})

async function reload() {
  const [tableResponse, versionsResponse, callsResponse] = await Promise.all([
    gandalf.tables.getById(tableId),
    gandalf.tables.versions.list(tableId),
    gandalf.tables.versions.calls(tableId).catch(() => null),
  ])
  table.value = tableResponse.data
  versions.value = sortVersions(versionsResponse.data)
  calls.value = callsResponse?.data ?? []
  windowDays.value = callsResponse?.meta?.window_days ?? 30
}

function originLabel(version: TableVersionSummary): string {
  if (!version.origin_version_id) return '—'
  const origin = versions.value.find(v => v._id === version.origin_version_id)
  if (!origin) return t('versions.deletedVersion')
  return versionNumberLabel(origin) ?? (origin.name || t('versions.draft'))
}

// Le brouillon s'ouvre dans l'éditeur, sur sa première variante.
function editLink(version: TableVersionSummary): string {
  const variant = table.value?.variants[0]?._id ?? 'first'
  return `/tables/${tableId}/${variant}/edit?version=${version._id}`
}

// La répartition de la version active est un changement de production.
function canSplit(version: TableVersionSummary): boolean {
  return can('tables_update') && (!version.is_active || can('tables_activate'))
}

function canDelete(version: TableVersionSummary): boolean {
  if (version.is_active) return false
  return version.status === 'draft' ? can('tables_update') : can('tables_publish')
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return isNaN(date.getTime()) ? iso : date.toLocaleString()
}

function onDraftCreated(draft: TableVersion) {
  toast.add({ title: t('versions.draftCreated'), color: 'success' })
  navigateTo(editLink(draft))
}

function onPublished(version: TableVersion) {
  toast.add({ title: t('versions.publishedToast', { number: version.number }), color: 'success' })
  reload()
}

function onSplitSaved() {
  toast.add({ title: t('versions.splitSaved'), color: 'success' })
  reload()
}

async function remove(version: TableVersionSummary) {
  const label = versionNumberLabel(version) ?? (version.name || t('versions.draft'))
  if (!confirm(t('versions.deleteConfirm', { name: label }))) return
  try {
    await gandalf.tables.versions.remove(tableId, version._id)
    toast.add({ title: t('versions.deleted'), color: 'success' })
    await reload()
  }
  catch (e) {
    const { code, message } = apiErrorCode(e)
    toast.add({ title: code === 'version_in_use' ? t('versions.inUse') : (message || t('errors.failedToSave')), color: 'error' })
  }
}
</script>
