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

      <!-- Flows qui utilisent la table : la version de table de chaque nœud,
           et l'action groupée qui les amène à la version active -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-semibold">{{ $t('versions.flowsTitle') }}</h3>
            <UButton
              v-if="outdatedFlows.length && can('tables_update')"
              size="sm"
              icon="i-lucide-refresh-ccw"
              :loading="updatingFlows"
              @click="updateFlows"
            >
              {{ $t('versions.updateFlowsCount', { count: outdatedFlows.length }) }}
            </UButton>
          </div>
        </template>
        <div v-if="!flowUsages.length" class="text-center py-6 text-muted">{{ $t('versions.noFlows') }}</div>
        <ul v-else class="divide-y divide-default">
          <li v-for="usage in flowUsages" :key="usage._id" class="flex items-center justify-between gap-4 py-2 text-sm">
            <NuxtLink :to="`/flows/${usage._id}/edit`" class="text-primary hover:underline">{{ usage.title }}</NuxtLink>
            <span class="flex items-center gap-2 text-muted">
              {{ usage.nodes.map(n => n.table_version?.number ? `v${n.table_version.number}` : '—').join(', ') }}
              <UBadge v-if="usage.outdated" color="warning" variant="subtle" size="sm">{{ $t('versions.flowOutdated') }}</UBadge>
              <UBadge v-else color="success" variant="subtle" size="sm">{{ $t('versions.flowStatus.up_to_date') }}</UBadge>
            </span>
          </li>
        </ul>
        <ul v-if="flowUpdateResults.length" class="mt-3 space-y-1 text-sm">
          <li v-for="result in flowUpdateResults" :key="result._id" class="flex items-start gap-2">
            <UBadge :color="result.status === 'incompatible' ? 'warning' : 'success'" variant="soft" size="sm">
              {{ $t(`versions.flowStatus.${result.status}`) }}
            </UBadge>
            <span>
              {{ result.title }}
              <span v-if="result.version && result.version.status === 'draft'" class="text-muted"> · {{ $t('versions.flowDraftCreated') }}</span>
              <span v-if="result.errors.length" class="block text-xs text-muted">{{ result.errors.join(' ') }}</span>
            </span>
          </li>
        </ul>
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
      :owner-id="tableId"
      :from-version-id="draftFrom.id"
      :from-label="draftFrom.label"
      @created="onDraftCreated"
      @close="draftFrom = null"
    />
    <VersionPublishModal
      v-if="publishing"
      :owner-id="tableId"
      :draft="publishing"
      :diverging="divergence(publishing, versions)"
      @published="onPublished"
      @close="publishing = null"
    />
    <VersionActivateModal
      v-if="activating"
      :owner-id="tableId"
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
import type { FlowUpdateResult, TableFlowUsage, TableVersionSummary, VersionCall, VersionSummary } from '~/types/version'
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
const flowUsages = ref<TableFlowUsage[]>([])
const flowUpdateResults = ref<FlowUpdateResult[]>([])
const updatingFlows = ref(false)
const outdatedFlows = computed(() => flowUsages.value.filter(usage => usage.outdated))

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
  const [tableResponse, versionsResponse, callsResponse, flowsResponse] = await Promise.all([
    gandalf.tables.getById(tableId),
    gandalf.tables.versions.list(tableId),
    gandalf.tables.versions.calls(tableId).catch(() => null),
    gandalf.tables.versions.flows(tableId).catch(() => null),
  ])
  table.value = tableResponse.data
  versions.value = sortVersions(versionsResponse.data)
  calls.value = callsResponse?.data ?? []
  windowDays.value = callsResponse?.meta?.window_days ?? 30
  flowUsages.value = flowsResponse?.data ?? []
}

// Amène les flows à la version active de la table. Avec les droits de
// publication et d'activation, leurs nouvelles versions sont publiées et
// activées ; sinon elles restent en brouillon, à publier par qui le peut.
async function updateFlows() {
  updatingFlows.value = true
  try {
    const activate = can('tables_publish') && can('tables_activate')
    const response = await gandalf.tables.versions.updateFlows(tableId, {
      flow_ids: outdatedFlows.value.map(usage => usage._id),
      publish: activate,
      activate,
    })
    flowUpdateResults.value = response.data
    await reload()
  }
  catch (e) {
    toast.add({ title: apiErrorCode(e).message || t('errors.failedToSave'), color: 'error' })
  }
  finally { updatingFlows.value = false }
}

function originLabel(version: TableVersionSummary): string {
  if (!version.origin_version_id) return '—'
  const origin = versions.value.find(v => v._id === version.origin_version_id)
  if (!origin) return t('versions.deletedVersion')
  return versionNumberLabel(origin) ?? (origin.name || t('versions.draft'))
}

// Le brouillon s'ouvre dans l'éditeur ; une variante qu'il n'a pas (supprimée,
// ou copiée sous un nouvel _id) ouvre sa première variante.
function editLink(version: Pick<VersionSummary, '_id'>): string {
  const variant = table.value?.variants[0]?._id ?? 'first'
  return `/tables/${tableId}/${variant}/edit?version=${version._id}`
}

// La répartition d'une version publiée est un changement de production : la
// version active pour les appels directs, une autre pour les clés qui
// l'appellent avec `version` (gandalf.api, VERSIONS.md).
function canSplit(version: TableVersionSummary): boolean {
  return version.status === 'draft' ? can('tables_update') : can('tables_activate')
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

function onDraftCreated(draft: VersionSummary) {
  toast.add({ title: t('versions.draftCreated'), color: 'success' })
  navigateTo(editLink(draft))
}

function onPublished(version: VersionSummary) {
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
