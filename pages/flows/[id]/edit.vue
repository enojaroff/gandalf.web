<!-- Éditeur visuel d'un flow (DRG) : canvas Vue Flow + panneaux d'édition -->
<template>
  <div>
    <UBreadcrumb :items="breadcrumbs" class="mb-4" />

    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <UInput
          v-model="flowTitle"
          :placeholder="$t('flows.titlePlaceholder')"
          size="lg"
          variant="none"
          class="text-xl font-bold"
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
        <UButton icon="i-lucide-save" :loading="saving" @click="save">
          {{ $t('common.save') }}
        </UButton>
      </div>
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

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
    </div>

    <div v-else class="flow-editor-grid">
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
              <UButton icon="i-lucide-plus" size="xs" variant="ghost" @click="nodeModalOpen = true" />
            </div>
            <div v-if="!flow.nodes.length" class="text-xs text-muted">{{ $t('flows.noNodes') }}</div>
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
          :tables="tables"
          @update:flow="onFlowUpdate"
          @remove-node="removeNode"
          @remove-output="removeOutput"
        />
      </UCard>
    </div>

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
          <UFormField :label="$t('flows.nodeId')">
            <UInput v-model="newNode.node_id" placeholder="n_risk" class="w-full" />
          </UFormField>
          <UFormField :label="$t('flows.nodeTable')">
            <USelect v-model="newNode.table_id" :items="tableOptions" class="w-full" :placeholder="$t('flows.selectTable')" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" @click="nodeModalOpen = false">{{ $t('common.cancel') }}</UButton>
          <UButton :disabled="!newNode.node_id || !newNode.table_id" @click="addNode">{{ $t('common.add') }}</UButton>
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

    <!-- Run panel -->
    <FlowEditorRunPanel
      v-if="!isNew"
      v-model:open="runPanelOpen"
      :flow="flow"
    />
  </div>
</template>

<script setup lang="ts">
import type { Flow, FlowInput, FlowIOType } from '~/types/flow'
import type { DecisionTable } from '~/types/decision-table'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const gandalf = useGandalf()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const routeId = computed(() => route.params.id as string)
const isNew = computed(() => routeId.value === 'new')

const flow = ref<Flow>(emptyFlow())
const tables = ref<DecisionTable[]>([])
const loading = ref(true)
const saving = ref(false)
const validationErrors = ref<string[]>([])
const runPanelOpen = ref(false)

const inputModalOpen = ref(false)
const nodeModalOpen = ref(false)
const outputModalOpen = ref(false)

const newInput = reactive<{ key: string; type: FlowIOType }>({ key: '', type: 'string' })
const newNode = reactive<{ node_id: string; table_id: string }>({ node_id: '', table_id: '' })
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
]

const tableOptions = computed(() =>
  tables.value.map((t) => ({ label: t.title, value: t._id })),
)

const nodeOptions = computed(() =>
  flow.value.nodes.map((n) => ({ label: n.node_id, value: n.node_id })),
)

function emptyFlow(): Flow {
  return { _id: '', title: '', description: '', inputs: [], outputs: [], nodes: [], edges: [] }
}

async function load() {
  loading.value = true
  try {
    // The list endpoint returns a reduced projection (no `fields`), which is
    // fine for the "add node" picker. The canvas needs each node's fields, so
    // we load the full detail of the tables actually used by the flow below.
    const tablesResp = await gandalf.tables.list(200, 1)
    tables.value = tablesResp.data

    if (isNew.value) {
      flow.value = emptyFlow()
      flow.value.title = t('flows.untitled')
    }
    else {
      const resp = await gandalf.flows.getById(routeId.value)
      flow.value = { ...emptyFlow(), ...resp.data }
      // Fetch full detail (with fields) for every referenced table, in parallel.
      await Promise.all(
        [...new Set(flow.value.nodes.map((n) => n.table_id))].map(ensureTableDetail),
      )
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

function onFlowUpdate(updated: Flow) {
  flow.value = updated
}

function addInput() {
  if (!newInput.key) return
  if (!flow.value.inputs.some((i) => i.key === newInput.key)) {
    flow.value.inputs.push({ key: newInput.key, type: newInput.type } as FlowInput)
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

function addNode() {
  if (!newNode.node_id || !newNode.table_id) return
  const tableId = newNode.table_id
  if (!flow.value.nodes.some((n) => n.node_id === newNode.node_id)) {
    flow.value.nodes.push({ node_id: newNode.node_id, table_id: tableId })
  }
  // Load the table's fields so its field handles render on the canvas.
  ensureTableDetail(tableId)
  newNode.node_id = ''
  newNode.table_id = ''
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
  if (!newOutput.name || !newOutput.from_node) return
  if (!flow.value.outputs.some((o) => o.name === newOutput.name)) {
    flow.value.outputs.push({
      name: newOutput.name,
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
      inputs: flow.value.inputs,
      outputs: flow.value.outputs,
      nodes: flow.value.nodes,
      edges: flow.value.edges,
    }
    if (isNew.value) {
      const resp = await gandalf.flows.create(payload)
      toast.add({ title: t('flows.created'), color: 'success' })
      router.replace(`/flows/${resp.data._id}/edit`)
    }
    else {
      const resp = await gandalf.flows.update(routeId.value, payload)
      flow.value = { ...emptyFlow(), ...resp.data }
      toast.add({ title: t('flows.saved'), color: 'success' })
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

onMounted(load)
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
