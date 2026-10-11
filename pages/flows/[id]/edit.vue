<!-- Éditeur visuel d'un flow (DRG) : canvas Vue Flow + panneaux d'édition.
     Comme pour les tables, on édite toujours un brouillon (gandalf.api,
     VERSIONS.md) : ?version= désigne le brouillon ou la version de départ ;
     sans lui, la version active. Chaque nœud est figé sur une version publiée
     de sa table. -->
<template>
  <div>
    <!-- En-tête à la largeur standard ; seule la grille de l'éditeur occupe toute la fenêtre -->
    <UContainer>
      <UBreadcrumb :items="breadcrumbs" class="mb-4" />

      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2 flex-1 mr-4">
          <UIcon name="i-lucide-pencil" class="text-muted shrink-0" />
          <UInput
            v-model="flowTitle"
            :placeholder="$t('flows.titlePlaceholder')"
            size="lg"
            class="text-xl font-bold flex-1 max-w-md"
          />
        </div>
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-play"
            variant="soft"
            :disabled="isNew"
            @click="runPanelOpen = true"
          >
            {{ $t('flows.run') }}
          </UButton>
          <UButton v-if="!isNew" icon="i-lucide-history" variant="ghost" :to="`/flows/${routeId}/versions`">
            {{ $t('versions.title') }}
          </UButton>
          <UButton icon="i-lucide-save" :loading="saving" @click="save">
            {{ $t('common.save') }}
          </UButton>
          <UButton
            v-if="!isNew && isAdmin"
            icon="i-lucide-copy"
            variant="ghost"
            title="Copier vers un autre projet"
            @click="() => { copyMove = { mode: 'copy', item: flow } }"
          />
          <UButton
            v-if="!isNew && isAdmin"
            icon="i-lucide-corner-up-right"
            variant="ghost"
            title="Déplacer vers un autre projet"
            @click="() => { copyMove = { mode: 'move', item: flow } }"
          />
          <UButton
            v-if="!isNew"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            :title="$t('flows.deleteFlow')"
            @click="deleteModalOpen = true"
          />
        </div>
      </div>

      <!-- Version éditée : un brouillon, ou la version de départ d'un nouveau brouillon -->
      <UAlert
        v-if="!isNew"
        :color="draft ? 'warning' : 'info'"
        variant="subtle"
        :icon="draft ? 'i-lucide-file-pen' : 'i-lucide-info'"
        class="mb-4"
      >
        <template #description>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span v-if="draft">
              {{ $t('versions.editorDraft', { name: draft.name || '—' }) }}
              <span v-if="draftOriginLabel" class="text-muted">· {{ $t('versions.editorFrom', { version: draftOriginLabel }) }}</span>
            </span>
            <span v-else-if="base">{{ $t('versions.editorFromVersion', { version: baseLabel }) }}</span>
            <span v-else>{{ $t('versions.flowNoVersion') }}</span>
            <UButton
              v-if="draft && projectsStore.can('tables_publish')"
              size="xs"
              icon="i-lucide-stamp"
              @click="() => { showPublish = true }"
            >
              {{ $t('versions.publish') }}
            </UButton>
          </div>
        </template>
      </UAlert>

      <!-- Catégorie du flow -->
      <div class="flex items-center gap-2 mb-4">
        <span class="text-xs font-semibold text-muted uppercase shrink-0">Catégorie</span>
        <CategorySelect v-model="flow.category_id" :categories="categories" />
      </div>

      <!-- Validation errors (422) -->
      <UAlert
        v-if="validationErrors.length"
        icon="i-lucide-alert-triangle"
        color="error"
        variant="soft"
        class="mb-4"
        :title="$t('flows.validationFailed')"
      >
        <template #description>
          <ul class="list-disc pl-5 space-y-1">
            <li v-for="(err, i) in validationErrors" :key="i" class="text-sm">{{ err }}</li>
          </ul>
        </template>
      </UAlert>
    </UContainer>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
    </div>

    <UContainer v-else class="max-w-none">
      <div class="flow-editor-grid">
        <!-- Toolbar -->
        <UCard class="flow-editor-panel">
          <template #header>
            <span class="font-semibold text-sm">{{ $t('flows.buildTitle') }}</span>
          </template>
          <div class="space-y-4">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-medium text-muted uppercase">{{ $t('flows.inputs') }}</span>
                <UButton icon="i-lucide-plus" size="xs" variant="ghost" @click="inputModalOpen = true" />
              </div>
              <div v-if="!flow.inputs.length" class="text-xs text-muted">{{ $t('flows.noInputs') }}</div>
              <div v-for="inp in flow.inputs" :key="inp.key" class="flex items-center justify-between text-sm py-1">
                <span class="font-mono">{{ inp.key }} <span class="text-muted">: {{ inp.type }}</span></span>
                <UButton icon="i-lucide-x" size="xs" variant="ghost" color="neutral" @click="removeInput(inp.key)" />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-medium text-muted uppercase">{{ $t('flows.nodes') }}</span>
                <UButton icon="i-lucide-plus" size="xs" variant="ghost" @click="openNodeModal" />
              </div>
              <div v-if="!flow.nodes.length" class="text-xs text-muted">{{ $t('flows.noNodes') }}</div>
              <div v-else class="space-y-1">
                <div v-for="n in flow.nodes" :key="n.node_id" class="text-sm py-1">
                  <div class="flex items-center justify-between">
                    <span class="truncate">
                      {{ nodeDisplayName(n) }}
                      <span class="text-muted font-mono text-xs">{{ n.node_id }}</span>
                    </span>
                    <UButton icon="i-lucide-x" size="xs" variant="ghost" color="neutral" @click="removeNode(n.node_id)" />
                  </div>
                  <!-- Version de table figée pour ce nœud -->
                  <div class="flex items-center gap-1 mt-1">
                    <USelect
                      :model-value="n.table_version_id ?? undefined"
                      :items="pinOptions(n.table_id)"
                      :placeholder="$t('versions.pinActive')"
                      size="xs"
                      class="flex-1"
                      @update:model-value="(value: string) => setPin(n, value)"
                    />
                    <UBadge
                      v-if="pinStatus(n) === 'outdated'"
                      color="warning"
                      variant="subtle"
                      size="sm"
                      :title="$t('versions.pinOutdatedHint')"
                    >
                      {{ $t('versions.pinOutdated') }}
                    </UBadge>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-medium text-muted uppercase">{{ $t('flows.outputs') }}</span>
                <UButton icon="i-lucide-plus" size="xs" variant="ghost" @click="outputModalOpen = true" />
              </div>
              <div v-if="!flow.outputs.length" class="text-xs text-muted">{{ $t('flows.noOutputs') }}</div>
            </div>
          </div>
        </UCard>

        <!-- Canvas -->
        <UCard class="flow-editor-canvas" :ui="{ body: 'p-0 h-full' }">
          <FlowEditorFlowCanvas
            :flow="flow"
            :tables="canvasTables"
            @update:flow="onFlowUpdate"
            @remove-node="removeNode"
            @remove-output="removeOutput"
          />
        </UCard>
      </div>
    </UContainer>

    <!-- Add input modal -->
    <UModal v-model:open="inputModalOpen" :title="$t('flows.addInput')">
      <template #body>
        <div class="space-y-3">
          <UFormField :label="$t('flows.inputKey')">
            <UInput v-model="newInput.key" placeholder="salary" class="w-full" />
          </UFormField>
          <UFormField :label="$t('flows.inputType')">
            <USelect v-model="newInput.type" :items="ioTypeOptions" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" @click="inputModalOpen = false">{{ $t('common.cancel') }}</UButton>
          <UButton :disabled="!newInput.key" @click="addInput">{{ $t('common.add') }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- Add node modal -->
    <UModal v-model:open="nodeModalOpen" :title="$t('flows.addNode')">
      <template #body>
        <div class="space-y-3">
          <UFormField :label="$t('flows.nodeTable')">
            <USelect
              v-model="newNode.table_id"
              :items="tableOptions"
              class="w-full"
              :placeholder="$t('flows.selectTable')"
              @update:model-value="onNodeTableChange"
            />
          </UFormField>
          <UFormField :label="$t('flows.nodeId')" :error="nodeIdError">
            <UInput v-model="newNode.node_id" class="w-full font-mono" />
          </UFormField>
          <UFormField :label="$t('flows.nodeLabel')" :hint="$t('common.optional')">
            <UInput v-model="newNode.label" :placeholder="$t('flows.nodeLabelPlaceholder')" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" @click="nodeModalOpen = false">{{ $t('common.cancel') }}</UButton>
          <UButton :disabled="!newNode.table_id || nodeIdError !== ''" @click="addNode">{{ $t('common.add') }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- Add output modal -->
    <UModal v-model:open="outputModalOpen" :title="$t('flows.addOutput')">
      <template #body>
        <div class="space-y-3">
          <UFormField :label="$t('flows.outputName')">
            <UInput v-model="newOutput.name" placeholder="verdict" class="w-full" />
          </UFormField>
          <UFormField :label="$t('flows.outputNode')">
            <USelect v-model="newOutput.from_node" :items="nodeOptions" class="w-full" :placeholder="$t('flows.selectNode')" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" @click="outputModalOpen = false">{{ $t('common.cancel') }}</UButton>
          <UButton :disabled="!newOutput.name || !newOutput.from_node" @click="addOutput">{{ $t('common.add') }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete confirmation modal -->
    <UModal v-model:open="deleteModalOpen" :title="$t('flows.deleteFlow')">
      <template #body>
        <p class="text-sm">
          {{ $t('flows.deleteFlowConfirm', { title: flow.title || $t('flows.untitled') }) }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" @click="deleteModalOpen = false">{{ $t('common.cancel') }}</UButton>
          <UButton color="error" :loading="deleting" @click="deleteFlow">{{ $t('common.delete') }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- Run panel : exécution de test du brouillon ou de la version éditée -->
    <FlowEditorRunPanel
      v-if="!isNew"
      v-model:open="runPanelOpen"
      :flow="flow"
      :node-labels="nodeLabels"
      :version-id="draft?._id ?? base?._id"
    />

    <VersionPublishModal
      v-if="showPublish && draft"
      kind="flow"
      :owner-id="routeId"
      :draft="draft"
      @published="onPublished"
      @close="showPublish = false"
    />

    <!-- Copier / déplacer vers un autre projet (admin) -->
    <CopyMoveModal
      v-if="copyMove"
      resource="flow"
      :mode="copyMove.mode"
      :item="copyMove.item"
      @close="copyMove = null"
      @saved="onCopyMoveSaved"
    />
  </div>
</template>

<script setup lang="ts">
import type { Flow, FlowInput, FlowIOType, FlowNode } from '~/types/flow'
import type { DecisionField, DecisionTable } from '~/types/decision-table'
import type { Category } from '~/types/category'
import type { FlowVersion, TableVersionSummary, VersionSummary } from '~/types/version'
import CategorySelect from '~/components/categories/CategorySelect.vue'
import CopyMoveModal from '~/components/modals/CopyMoveModal.vue'
import VersionPublishModal from '~/components/versions/VersionPublishModal.vue'
import { defaultDraftName, versionNumberLabel } from '~/utils/versions'
import { pinStatusOf, tablesForPins } from '~/utils/flowPins'

// fullWidth : la page gère elle-même ses conteneurs pour que le canvas occupe toute la largeur de la fenêtre (cf. layouts/default.vue)
definePageMeta({ middleware: 'auth', fullWidth: true })

const { t } = useI18n()
const gandalf = useGandalf()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const projectsStore = useProjectsStore()

const routeId = computed(() => route.params.id as string)
const isNew = computed(() => routeId.value === 'new')

// Copier/déplacer vers un autre projet — admin uniquement.
const isAdmin = computed(() => projectsStore.isAdmin)
const copyMove = ref<{ mode: 'copy' | 'move'; item: Flow } | null>(null)

function onCopyMoveSaved() {
  // Un déplacement retire le flow du projet courant : revenir à la liste.
  if (copyMove.value?.mode === 'move') {
    router.push('/flows')
  }
}

const flow = ref<Flow>(emptyFlow())
const tables = ref<DecisionTable[]>([])

// Brouillon édité, ou version de départ (publiée) quand il n'y en a pas encore
const draft = ref<FlowVersion | null>(null)
const base = ref<FlowVersion | null>(null)
const showPublish = ref(false)
// Identité du flow telle qu'enregistrée : seul un changement la renvoie à l'API
let identitySnapshot = ''

// Versions publiées de chaque table utilisée, et champs des versions figées
const tableVersions = ref<Record<string, TableVersionSummary[]>>({})
const pinnedFields = ref<Record<string, DecisionField[]>>({})

const baseLabel = computed(() => (base.value ? versionNumberLabel(base.value) : null) ?? '—')
const draftOriginLabel = computed(() => {
  const origin = draft.value?.origin_version_id
  return origin && base.value?._id === origin ? versionNumberLabel(base.value) : null
})

// Le canvas lit les champs d'un nœud sur sa table : ceux de la version figée.
const canvasTables = computed(() => tablesForPins(tables.value, flow.value.nodes, pinnedFields.value))

function activeVersionOf(tableId: string): string | null {
  return tableVersions.value[tableId]?.find(v => v.is_active)?._id ?? null
}

function pinStatus(node: FlowNode) {
  return pinStatusOf(node, activeVersionOf(node.table_id))
}

function pinOptions(tableId: string) {
  return (tableVersions.value[tableId] ?? [])
    .filter(v => v.status === 'published')
    .map(v => ({
      label: `${versionNumberLabel(v)}${v.is_active ? ` (${t('versions.active')})` : ''}`,
      value: v._id,
    }))
}

async function loadTableVersions(tableId: string) {
  if (tableVersions.value[tableId]) return
  try {
    const response = await gandalf.tables.versions.list(tableId)
    tableVersions.value = { ...tableVersions.value, [tableId]: response.data }
  }
  catch {
    tableVersions.value = { ...tableVersions.value, [tableId]: [] }
  }
}

// Les champs d'une version figée qui n'est pas la version active (la table
// chargée porte déjà ceux de la version active).
async function loadPinnedFields(node: FlowNode) {
  const pin = node.table_version_id
  if (!pin || pinnedFields.value[pin] || pin === activeVersionOf(node.table_id)) return
  try {
    const response = await gandalf.tables.versions.get(node.table_id, pin)
    pinnedFields.value = { ...pinnedFields.value, [pin]: response.data.fields }
  }
  catch {
    // Version supprimée : le canvas garde les champs de la table.
  }
}

function setPin(node: FlowNode, versionId: string) {
  node.table_version_id = versionId
  loadPinnedFields(node)
}

function identityOf(value: Flow): string {
  return JSON.stringify([value.title, value.description ?? '', value.category_id ?? null])
}

function onPublished(version: VersionSummary) {
  toast.add({ title: t('versions.publishedToast', { number: version.number }), color: 'success' })
  router.push(`/flows/${routeId.value}/versions`)
}
// Catégories de l'application, pour le sélecteur dans l'en-tête.
const categories = ref<Category[]>([])
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const validationErrors = ref<string[]>([])
const runPanelOpen = ref(false)

const inputModalOpen = ref(false)
const nodeModalOpen = ref(false)
const outputModalOpen = ref(false)
const deleteModalOpen = ref(false)

const newInput = reactive<{ key: string; type: FlowIOType }>({ key: '', type: 'string' })
const newNode = reactive<{ table_id: string; node_id: string; label: string }>({ table_id: '', node_id: '', label: '' })
const newOutput = reactive<{ name: string; from_node: string }>({ name: '', from_node: '' })

const flowTitle = computed({
  get: () => flow.value.title,
  set: (v: string) => { flow.value.title = v },
})

const breadcrumbs = computed(() => [
  { label: t('flows.title'), to: '/flows' },
  { label: flow.value.title || t('flows.untitled') },
])

const ioTypeOptions = [
  { label: 'string', value: 'string' },
  { label: 'numeric', value: 'numeric' },
  { label: 'boolean', value: 'boolean' },
  { label: 'date', value: 'date' },
]

const tableOptions = computed(() =>
  tables.value.map((t) => ({ label: t.title, value: t._id })),
)

// Human-readable name for a node: its label, else the referenced table title,
// falling back to the raw id. Used by the output picker and the run trace so
// the user sees "Scoring FR" instead of "n_2".
function nodeDisplayName(node: FlowNode): string {
  if (node.label) return node.label
  const table = tables.value.find((t) => t._id === node.table_id)
  return table?.title ?? node.node_id
}

// node_id → display name, passed to the RunPanel so its node trace shows names.
const nodeLabels = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const n of flow.value.nodes) map[n.node_id] = nodeDisplayName(n)
  return map
})

const nodeOptions = computed(() =>
  flow.value.nodes.map((n) => ({ label: nodeDisplayName(n), value: n.node_id })),
)

// Live validation of the (editable) node id: format + uniqueness.
const nodeIdError = computed(() => {
  const id = newNode.node_id.trim()
  if (id === '') return t('flows.nodeIdInvalid')
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return t('flows.nodeIdInvalid')
  if (flow.value.nodes.some((n) => n.node_id === id)) return t('flows.nodeIdDuplicate')
  return ''
})

function emptyFlow(): Flow {
  return { _id: '', title: '', description: '', category_id: null, inputs: [], outputs: [], nodes: [], edges: [] }
}

async function load() {
  loading.value = true
  try {
    // The list endpoint returns a reduced projection (no `fields`), which is
    // fine for the "add node" picker. The canvas needs each node's fields, so
    // we load the full detail of the tables actually used by the flow below.
    const [tablesResp, categoriesResp] = await Promise.all([
      gandalf.tables.list(200, 1),
      gandalf.categories.list().catch(() => ({ data: { categories: [] as Category[] } })),
    ])
    tables.value = tablesResp.data
    categories.value = categoriesResp.data.categories

    if (isNew.value) {
      flow.value = emptyFlow()
      flow.value.title = t('flows.untitled')
    }
    else {
      const resp = await gandalf.flows.getById(routeId.value)
      // ?version= : un brouillon, ou une version publiée de départ ; sinon la version active
      const versionId = (route.query.version as string | undefined) || resp.data.active_version_id || null
      const version = versionId ? (await gandalf.flows.versions.get(routeId.value, versionId)).data : null
      draft.value = null
      base.value = null
      if (version?.status === 'draft') {
        draft.value = version
        base.value = version.origin_version_id
          ? (await gandalf.flows.versions.get(routeId.value, version.origin_version_id).catch(() => null))?.data ?? null
          : null
      }
      else {
        base.value = version
      }
      flow.value = version
        ? { ...emptyFlow(), ...resp.data, inputs: version.inputs, outputs: version.outputs, nodes: version.nodes, edges: version.edges }
        : { ...emptyFlow(), ...resp.data }
      identitySnapshot = identityOf(flow.value)
      // Fetch full detail (with fields) for every referenced table, in parallel,
      // with its versions and the fields of the versions the nodes are pinned to.
      const tableIds = [...new Set(flow.value.nodes.map((n) => n.table_id))]
      await Promise.all([...tableIds.map(ensureTableDetail), ...tableIds.map(loadTableVersions)])
      await Promise.all(flow.value.nodes.map(loadPinnedFields))
    }
  }
  catch {
    toast.add({ title: t('flows.loadError'), color: 'error' })
  }
  finally {
    loading.value = false
  }
}

// Load a table's full detail (which includes `fields`) and merge it into the
// tables list, so the canvas can render that node's field handles. The list
// endpoint omits `fields`, so a table is only "complete" once fetched by id.
async function ensureTableDetail(tableId: string) {
  const existing = tables.value.find((t) => t._id === tableId)
  if (existing?.fields?.length) return
  try {
    const resp = await gandalf.tables.getById(tableId)
    const idx = tables.value.findIndex((t) => t._id === tableId)
    if (idx >= 0) tables.value[idx] = resp.data
    else tables.value.push(resp.data)
  }
  catch {
    // Table may have been deleted; the canvas shows it as "missing".
  }
}

// Single source of truth for the flow is `flow.value`. The canvas owns edges
// and output wiring: it emits a fresh (structured-cloned) Flow via update:flow,
// which we adopt wholesale here. This page owns inputs / nodes / outputs: it
// mutates flow.value in place. Both paths funnel through this one ref, so the
// canvas prop always reflects the latest state — never keep a separate copy of
// flow.edges/outputs around, or it will drift from what the canvas emitted.
function onFlowUpdate(updated: Flow) {
  flow.value = updated
}

// Output source name that the DRG reserves for a node's decision. Users must
// not name a flow output after it, to avoid ambiguity at execution.
const RESERVED_IO_NAMES = new Set(['final_decision'])

function addInput() {
  const key = newInput.key.trim()
  // Reject empty, reserved, or duplicate keys.
  if (!key || RESERVED_IO_NAMES.has(key)) return
  if (!flow.value.inputs.some((i) => i.key === key)) {
    flow.value.inputs.push({ key, type: newInput.type } as FlowInput)
  }
  newInput.key = ''
  newInput.type = 'string'
  inputModalOpen.value = false
}

function removeInput(key: string) {
  flow.value.inputs = flow.value.inputs.filter((i) => i.key !== key)
  // Drop edges sourced from this input.
  flow.value.edges = flow.value.edges.filter((e) => e.from.input !== key)
}

// Generate a short, unique, human-readable node id (n_1, n_2, …). The user no
// longer types it — only the optional label — so we own it.
function nextNodeId(): string {
  let i = flow.value.nodes.length + 1
  const taken = new Set(flow.value.nodes.map((n) => n.node_id))
  while (taken.has(`n_${i}`)) i++
  return `n_${i}`
}

// An id still holding an auto-generated value (n_<number>) or empty — i.e. one
// the user has not personalised, so we may freely refresh it.
function isAutoNodeId(id: string): boolean {
  return id.trim() === '' || /^n_\d+$/.test(id.trim())
}

// Reset the add-node form and open the modal with a fresh default id.
function openNodeModal() {
  newNode.table_id = ''
  newNode.node_id = nextNodeId()
  newNode.label = ''
  nodeModalOpen.value = true
}

// Refresh the default id when a table is picked, unless the user already typed
// their own (i.e. it still matches an auto-generated value).
function onNodeTableChange() {
  if (isAutoNodeId(newNode.node_id)) newNode.node_id = nextNodeId()
}

function addNode() {
  if (!newNode.table_id || nodeIdError.value !== '') return
  const tableId = newNode.table_id
  const label = newNode.label.trim()
  const node: FlowNode = { node_id: newNode.node_id.trim(), table_id: tableId }
  if (label) node.label = label
  flow.value.nodes.push(node)
  // Load the table's fields so its field handles render on the canvas, and its
  // versions; the node is pinned to the active one until another is chosen.
  ensureTableDetail(tableId)
  loadTableVersions(tableId).then(() => {
    const added = flow.value.nodes.find(n => n.node_id === node.node_id)
    const active = activeVersionOf(tableId)
    if (added && !added.table_version_id && active) added.table_version_id = active
  })
  newNode.table_id = ''
  newNode.node_id = ''
  newNode.label = ''
  nodeModalOpen.value = false
}

function removeNode(nodeId: string) {
  flow.value.nodes = flow.value.nodes.filter((n) => n.node_id !== nodeId)
  // Drop edges touching this node, and outputs sourced from it.
  flow.value.edges = flow.value.edges.filter(
    (e) => e.into.node !== nodeId && e.from.node !== nodeId,
  )
  flow.value.outputs = flow.value.outputs.filter((o) => o.from_node !== nodeId)
}

function addOutput() {
  const name = newOutput.name.trim()
  // Reject empty, reserved, or names colliding with an input key or another
  // output — all of these are ambiguous in the assembled answer.
  if (!name || !newOutput.from_node || RESERVED_IO_NAMES.has(name)) return
  if (flow.value.inputs.some((i) => i.key === name)) return
  if (!flow.value.outputs.some((o) => o.name === name)) {
    flow.value.outputs.push({
      name,
      from_node: newOutput.from_node,
      from_output: 'final_decision',
    })
  }
  newOutput.name = ''
  newOutput.from_node = ''
  outputModalOpen.value = false
}

function removeOutput(name: string) {
  flow.value.outputs = flow.value.outputs.filter((o) => o.name !== name)
}

// Extract the DRG 422 error list: FetchError.data is the response body
// { meta, data: { errors: [...] } }.
function extractErrors(e: unknown): string[] {
  const body = (e as { data?: { data?: { errors?: string[] } } })?.data
  return body?.data?.errors ?? []
}

async function save() {
  saving.value = true
  validationErrors.value = []
  try {
    const payload: Partial<Flow> = {
      title: flow.value.title,
      description: flow.value.description,
      category_id: flow.value.category_id ?? null,
      inputs: flow.value.inputs,
      // Drop outputs whose source wire was removed (from_node cleared to ''):
      // an output with no source is incomplete and would be rejected by the
      // backend. The user re-wires it (or re-adds it) to send it.
      outputs: flow.value.outputs.filter((o) => o.from_node !== ''),
      nodes: flow.value.nodes,
      edges: flow.value.edges,
    }
    if (isNew.value) {
      const resp = await gandalf.flows.create(payload)
      // Adopt the persisted flow (with its new _id) BEFORE swapping the URL:
      // router.replace reuses this component (same dynamic route), so isNew
      // flips to false and the RunPanel appears immediately — it must receive a
      // flow with a real _id, not the empty one we started from.
      flow.value = { ...emptyFlow(), ...resp.data }
      toast.add({ title: t('flows.created'), color: 'success' })
      router.replace(`/flows/${resp.data._id}/edit`)
    }
    else {
      // L'identité (titre, description, catégorie) est celle du flow ; le
      // graphe va dans le brouillon, créé au premier enregistrement.
      if (identityOf(flow.value) !== identitySnapshot) {
        await gandalf.flows.update(routeId.value, {
          title: payload.title,
          description: payload.description,
          category_id: payload.category_id,
        })
        identitySnapshot = identityOf(flow.value)
      }
      if (!draft.value) {
        const created = await gandalf.flows.versions.create(routeId.value, {
          from_version_id: base.value?._id,
          name: defaultDraftName(),
        })
        draft.value = created.data
        router.replace({ query: { ...route.query, version: created.data._id } })
        toast.add({ title: t('versions.draftCreated'), color: 'success' })
      }
      const resp = await gandalf.flows.versions.update(routeId.value, draft.value._id, {
        inputs: payload.inputs,
        outputs: payload.outputs,
        nodes: payload.nodes,
        edges: payload.edges,
      })
      draft.value = resp.data
      flow.value = { ...flow.value, inputs: resp.data.inputs, outputs: resp.data.outputs, nodes: resp.data.nodes, edges: resp.data.edges }
      toast.add({ title: t('versions.editorSaved'), color: 'success' })
    }
  }
  catch (e) {
    const errors = extractErrors(e)
    if (errors.length) {
      validationErrors.value = errors
    }
    else {
      toast.add({ title: t('flows.saveError'), color: 'error' })
    }
  }
  finally {
    saving.value = false
  }
}

async function deleteFlow() {
  deleting.value = true
  try {
    await gandalf.flows.delete(routeId.value)
    toast.add({ title: t('flows.deleted'), color: 'success' })
    await router.push('/flows')
  }
  catch {
    toast.add({ title: t('flows.deleteError'), color: 'error' })
    deleting.value = false
  }
}

onMounted(() => {
  load()
  // Rôle et droits projet : copier/déplacer (admins), publier (tables_publish).
  if (projectsStore.currentUserRole === null || projectsStore.currentUserScopes === null) {
    projectsStore.fetchCurrentUserRole()
  }
})
</script>

<style scoped>
.flow-editor-grid {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 1rem;
  height: calc(100vh - 220px);
  min-height: 500px;
}

.flow-editor-panel {
  overflow-y: auto;
}

.flow-editor-canvas {
  height: 100%;
  overflow: hidden;
}
</style>
