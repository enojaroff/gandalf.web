<!--
  FlowCanvas — visual editor for a Decision Requirement Graph.

  Maps the backend Flow shape (inputs / nodes / edges / outputs) onto Vue Flow's
  node/edge model and back:
    - a flow input  -> a visual "input" node  (source handle = its key)
    - a table node  -> a visual "table" node  (one target handle per table
                       field, one source handle "final_decision")
    - a flow output -> a visual "output" node (target handle = its name)
  An edge connects a source handle to a target handle; on connect/disconnect we
  rebuild the backend `edges` and `outputs` arrays and emit `update:flow`.

  Node positions are laid out by role (inputs left, tables middle, outputs
  right) and kept only client-side (the backend does not store coordinates).
-->
<template>
  <div class="flow-canvas">
    <VueFlow
      :nodes="vfNodes"
      :edges="vfEdges"
      :default-viewport="{ zoom: 0.9 }"
      :min-zoom="0.2"
      :max-zoom="2"
      :connect-on-click="true"
      fit-view-on-init
      @connect="onConnect"
      @edges-change="onEdgesChange"
      @nodes-change="onNodesChange"
    >
      <Background :gap="16" pattern-color="#cbd5e1" />
      <Controls />

      <!-- How-to-wire hint -->
      <Panel position="top-left" class="vf-hint">
        <UIcon name="i-lucide-mouse-pointer-click" class="vf-hint__icon" />
        <span>{{ $t('flows.wireHint') }}</span>
      </Panel>

      <!-- Input node (custom type name to avoid Vue Flow's reserved 'input') -->
      <template #node-finput="{ data }">
        <div class="vf-node vf-node--input">
          <UIcon name="i-lucide-log-in" class="vf-node__icon" />
          <div class="vf-node__body">
            <div class="vf-node__title">{{ data.label }}</div>
            <div class="vf-node__sub">{{ data.type }}</div>
          </div>
          <Handle :id="data.key" type="source" :position="Position.Right" class="vf-handle vf-handle--source" />
        </div>
      </template>

      <!-- Table node: a target handle per field, one source handle -->
      <template #node-ftable="{ data }">
        <div class="vf-node vf-node--table" :class="{ 'vf-node--missing': data.missing }">
          <div class="vf-node__header">
            <UIcon name="i-lucide-table-2" class="vf-node__icon" />
            <div class="vf-node__title">{{ data.label }}</div>
            <UButton
              icon="i-lucide-x"
              size="xs"
              variant="ghost"
              color="neutral"
              class="vf-node__remove"
              @click.stop="$emit('remove-node', data.nodeId)"
            />
          </div>
          <div v-if="data.missing" class="vf-node__warn">{{ $t('flows.tableMissing') }}</div>
          <div class="vf-node__fields">
            <div v-for="field in data.fields" :key="field.key" class="vf-node__field">
              <Handle
                :id="`field:${field.key}`"
                type="target"
                :position="Position.Left"
                class="vf-handle vf-handle--field"
              />
              <span class="vf-node__field-key">{{ field.key }}</span>
              <span class="vf-node__field-type">{{ field.type }}</span>
            </div>
          </div>
          <div class="vf-node__out">
            <span class="vf-node__out-label">final_decision</span>
            <Handle
              id="out:final_decision"
              type="source"
              :position="Position.Right"
              class="vf-handle vf-handle--out"
            />
          </div>
        </div>
      </template>

      <!-- Output node (custom type name to avoid Vue Flow's reserved 'output') -->
      <template #node-foutput="{ data }">
        <div class="vf-node vf-node--output">
          <Handle :id="`out:${data.name}`" type="target" :position="Position.Left" class="vf-handle vf-handle--field" />
          <div class="vf-node__body">
            <div class="vf-node__title">{{ data.name }}</div>
            <div class="vf-node__sub">{{ $t('flows.output') }}</div>
          </div>
          <UButton
            icon="i-lucide-x"
            size="xs"
            variant="ghost"
            color="neutral"
            @click.stop="$emit('remove-output', data.name)"
          />
        </div>
      </template>
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { VueFlow, Handle, Position, Panel, useVueFlow } from '@vue-flow/core'
import type { Connection, EdgeChange, NodeChange, Node, Edge } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import type { Flow, FlowEdge } from '~/types/flow'
import type { DecisionTable } from '~/types/decision-table'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const props = defineProps<{
  flow: Flow
  // Tables of the current project, so we can render each node's fields.
  tables: DecisionTable[]
}>()

const emit = defineEmits<{
  'update:flow': [flow: Flow]
  'remove-node': [nodeId: string]
  'remove-output': [name: string]
}>()

const { updateNodeInternals } = useVueFlow()

// Index tables by id for field lookup.
const tablesById = computed(() => {
  const map = new Map<string, DecisionTable>()
  for (const t of props.tables) map.set(t._id, t)
  return map
})

// ── Layout: assign a column per role, stack rows within a column. ───────────
function layout() {
  const colInput = 0
  const colTable = 360
  const colOutput = 900
  const rowGap = 160
  const pos: Record<string, { x: number; y: number }> = {}
  props.flow.inputs.forEach((inp, i) => {
    pos[`input:${inp.key}`] = { x: colInput, y: i * rowGap + 40 }
  })
  props.flow.nodes.forEach((n, i) => {
    pos[`table:${n.node_id}`] = { x: colTable, y: i * (rowGap + 60) + 40 }
  })
  props.flow.outputs.forEach((o, i) => {
    pos[`output:${o.name}`] = { x: colOutput, y: i * rowGap + 40 }
  })
  return pos
}

// ── Build Vue Flow nodes from the backend flow. ─────────────────────────────
const vfNodes = computed<Node[]>(() => {
  const pos = layout()
  const nodes: Node[] = []

  for (const inp of props.flow.inputs) {
    nodes.push({
      id: `input:${inp.key}`,
      type: 'finput',
      position: pos[`input:${inp.key}`],
      data: { key: inp.key, label: inp.key, type: inp.type },
    })
  }

  for (const n of props.flow.nodes) {
    const table = tablesById.value.get(n.table_id)
    nodes.push({
      id: `table:${n.node_id}`,
      type: 'ftable',
      position: pos[`table:${n.node_id}`],
      data: {
        nodeId: n.node_id,
        label: table?.title ?? n.node_id,
        missing: !table,
        fields: (table?.fields ?? []).map((f) => ({ key: f.key, type: f.type })),
      },
    })
  }

  for (const o of props.flow.outputs) {
    nodes.push({
      id: `output:${o.name}`,
      type: 'foutput',
      position: pos[`output:${o.name}`],
      data: { name: o.name, from_node: o.from_node, from_output: o.from_output },
    })
  }

  return nodes
})

// ── Build Vue Flow edges from backend edges + outputs. ──────────────────────
const vfEdges = computed<Edge[]>(() => {
  const edges: Edge[] = []

  props.flow.edges.forEach((e, i) => {
    const source = e.from.input ? `input:${e.from.input}` : `table:${e.from.node}`
    const sourceHandle = e.from.input ? e.from.input : `out:${e.from.output ?? 'final_decision'}`
    edges.push({
      id: `e${i}`,
      source,
      sourceHandle,
      target: `table:${e.into.node}`,
      targetHandle: `field:${e.into.field}`,
      animated: true,
    })
  })

  // An output is drawn as an edge from its source node to the output node.
  props.flow.outputs.forEach((o, i) => {
    edges.push({
      id: `o${i}`,
      source: `table:${o.from_node}`,
      sourceHandle: `out:${o.from_output ?? 'final_decision'}`,
      target: `output:${o.name}`,
      targetHandle: `out:${o.name}`,
      style: { stroke: 'var(--ui-primary)' },
    })
  })

  return edges
})

// ── Handle a new connection: translate the Vue Flow Connection back into a
//    backend edge (or wire an output) and emit an updated flow. ─────────────
function onConnect(conn: Connection) {
  const flow = structuredClone(toRaw(props.flow)) as Flow

  // Target is an output node → set that output's source.
  if (conn.target?.startsWith('output:')) {
    const name = conn.target.slice('output:'.length)
    const fromNode = conn.source?.startsWith('table:') ? conn.source.slice('table:'.length) : null
    if (!fromNode) return
    const out = flow.outputs.find((o) => o.name === name)
    if (out) {
      out.from_node = fromNode
      out.from_output = 'final_decision'
    }
    emit('update:flow', flow)
    return
  }

  // Target is a table field.
  if (!conn.target?.startsWith('table:') || !conn.targetHandle?.startsWith('field:')) return
  const intoNode = conn.target.slice('table:'.length)
  const intoField = conn.targetHandle.slice('field:'.length)

  const from: FlowEdge['from'] = {}
  if (conn.source?.startsWith('input:')) {
    from.input = conn.source.slice('input:'.length)
  }
  else if (conn.source?.startsWith('table:')) {
    from.node = conn.source.slice('table:'.length)
    from.output = 'final_decision'
  }
  else {
    return
  }

  // Replace any existing edge into the same field (one wire per field).
  flow.edges = flow.edges.filter((e) => !(e.into.node === intoNode && e.into.field === intoField))
  flow.edges.push({ from, into: { node: intoNode, field: intoField } })
  emit('update:flow', flow)
}

// Edge removal (user selects an edge and deletes it).
function onEdgesChange(changes: EdgeChange[]) {
  const removed = changes.filter((c) => c.type === 'remove').map((c) => c.id)
  if (removed.length === 0) return
  const flow = structuredClone(toRaw(props.flow)) as Flow

  for (const id of removed) {
    if (id.startsWith('e')) {
      const idx = Number(id.slice(1))
      flow.edges.splice(idx, 1)
    }
    else if (id.startsWith('o')) {
      const idx = Number(id.slice(1))
      // Clearing an output edge just unsets its source (keeps the output slot).
      if (flow.outputs[idx]) {
        flow.outputs[idx].from_node = ''
      }
    }
  }
  emit('update:flow', flow)
}

// Positions change purely client-side; Vue Flow manages them internally.
function onNodesChange(_changes: NodeChange[]) {}

// Re-measure handles when the field set of a node changes.
watch(() => props.flow.nodes.length, () => nextTick(() => updateNodeInternals()))
</script>

<style scoped>
.flow-canvas {
  width: 100%;
  height: 100%;
  min-height: 480px;
}

.vf-node {
  position: relative;
  border-radius: 8px;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg);
  font-size: 12px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
}

.vf-node--input,
.vf-node--output {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  min-width: 130px;
}

.vf-node--input {
  border-left: 3px solid #3b82f6;
}

.vf-node--output {
  border-right: 3px solid var(--ui-primary);
}

.vf-node__icon {
  font-size: 16px;
  flex-shrink: 0;
}

.vf-node__title {
  font-weight: 600;
}

.vf-node__sub {
  color: var(--ui-text-muted);
  font-size: 10px;
}

.vf-node--table {
  min-width: 200px;
}

.vf-node--table.vf-node--missing {
  border-color: #ef4444;
}

.vf-node__header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--ui-border);
}

.vf-node__header .vf-node__title {
  flex: 1;
}

.vf-node__remove {
  margin-left: auto;
}

.vf-node__warn {
  color: #ef4444;
  padding: 4px 10px;
  font-size: 11px;
}

.vf-node__fields {
  padding: 4px 0;
}

.vf-node__field {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 10px 4px 14px;
}

.vf-node__field-key {
  font-family: monospace;
}

.vf-node__field-type {
  color: var(--ui-text-muted);
  font-size: 10px;
}

.vf-node__out {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding: 6px 14px 6px 10px;
  border-top: 1px solid var(--ui-border);
}

.vf-node__out-label {
  font-family: monospace;
  font-size: 10px;
  color: var(--ui-primary);
}

/* Handles: make them large, visible and obviously grabbable. Vue Flow's base
   style.css only positions them (5px, no colour); we override the internal
   .vue-flow__handle class via :deep so they read as real connection points. */
:deep(.vue-flow__handle) {
  width: 12px;
  height: 12px;
  border: 2px solid var(--ui-bg);
  border-radius: 100%;
  background: #94a3b8;
  cursor: crosshair;
  transition: transform 0.1s ease, background 0.1s ease;
}

/* Colours use !important to beat Vue Flow's theme-default rules, which target
   handles via a two-class selector (e.g. `.vue-flow__node-input .vue-flow__handle`)
   and would otherwise win on specificity. Our node types are also renamed away
   from the reserved input/output names so those theme rules no longer match. */

/* Source handles (right side): where you START a wire. */
:deep(.vf-handle--source) {
  background: #3b82f6 !important;
}

/* Field target handles (left side): where you DROP a wire. */
:deep(.vf-handle--field) {
  background: #3b82f6 !important;
}

/* A table's final_decision output handle. */
:deep(.vf-handle--out) {
  background: var(--ui-primary) !important;
}

/* Grow on hover so the grab target is forgiving and the affordance is clear. */
:deep(.vue-flow__handle:hover) {
  transform: scale(1.4);
}

:deep(.vue-flow__handle.connecting),
:deep(.vue-flow__handle.connectionindicator) {
  background: var(--ui-primary);
}

/* Highlight valid drop targets while dragging a connection. */
:deep(.vue-flow__handle-connecting) {
  transform: scale(1.5);
}

.vf-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 11px;
  color: var(--ui-text-muted);
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
  max-width: 260px;
}

.vf-hint__icon {
  font-size: 14px;
  flex-shrink: 0;
  color: var(--ui-primary);
}
</style>
