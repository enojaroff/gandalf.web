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
      :pan-on-drag="interaction.panOnDrag"
      :pan-on-scroll="interaction.panOnScroll"
      :zoom-on-scroll="interaction.zoomOnScroll"
      :zoom-on-pinch="interaction.zoomOnPinch"
      :zoom-on-double-click="false"
      fit-view-on-init
      @connect="onConnect"
      @edges-change="onEdgesChange"
      @nodes-change="onNodesChange"
    >
      <Background :gap="16" pattern-color="#cbd5e1" />
      <Controls />

      <!-- How-to-wire hint (adapts to the user's input-mode preference) -->
      <Panel position="top-left" class="vf-hint">
        <UIcon name="i-lucide-mouse-pointer-click" class="vf-hint__icon" />
        <span>{{ inputMode === 'trackpad' ? $t('flows.wireHintTrackpad') : $t('flows.wireHint') }}</span>
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
            <div class="vf-node__heading">
              <div class="vf-node__title">{{ data.tableTitle ?? data.nodeId }}</div>
              <div v-if="data.label" class="vf-node__label">{{ data.label }}</div>
            </div>
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

// Vue Flow's Node generic is deeply recursive and trips TS's "excessively deep"
// guard as soon as it's used in a Map/record. We keep our own minimal node
// shape for internal state and cast to Vue Flow's Node only at the <VueFlow>
// boundary (Vue Flow reads exactly these fields).
interface VFNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}
import type { Flow, FlowEdge, CanvasPosition } from '~/types/flow'
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

const { updateNodeInternals, findNode } = useVueFlow()

// ── Input mode (mouse ↔ trackpad) ───────────────────────────────────────────
// A per-USER preference (edited on the profile page, persisted with the
// profile), not a per-machine or per-flow setting. We only READ it here.
// Mirrors Genesis's two modes:
//   - mouse    : wheel = zoom (cursor-centred); drag the background to pan.
//   - trackpad : two-finger swipe = 2D pan; pinch (or Ctrl/Cmd+wheel) = zoom;
//                background drag disabled to avoid ambiguous gestures.
// Vue Flow exposes exactly these behaviours through props, so we map the mode
// onto them instead of hand-rolling a wheel handler.
const userStore = useUserStore()
const inputMode = computed(() =>
  userStore.currentUser?.settings?.flow_input_mode === 'trackpad' ? 'trackpad' : 'mouse',
)

// Vue Flow interaction props derived from the current mode.
const interaction = computed(() => {
  if (inputMode.value === 'trackpad') {
    return { panOnDrag: false, panOnScroll: true, zoomOnScroll: false, zoomOnPinch: true }
  }
  // mouse
  return { panOnDrag: true, panOnScroll: false, zoomOnScroll: true, zoomOnPinch: true }
})

// Index tables by id for field lookup.
const tablesById = computed(() => {
  const map = new Map<string, DecisionTable>()
  for (const t of props.tables) map.set(t._id, t)
  return map
})

// Column x-positions per role; a fresh node gets stacked below the last one in
// its column. Positions are assigned ONCE per node and then preserved (so a
// node the user has dragged, or that was already placed, never jumps when the
// flow changes) — this is why vfNodes is a mutable ref, not a computed.
const COL = { input: 0, table: 360, output: 900 }
const ROW_GAP = 170

// Remember every position we have assigned, keyed by node id, so re-syncs and
// remounts keep the same layout.
const positions = new Map<string, { x: number; y: number }>()

function nextPosition(id: string, column: keyof typeof COL): { x: number; y: number } {
  const existing = positions.get(id)
  if (existing) return existing
  // Stack below the lowest node currently in this column.
  const x = COL[column]
  let maxY = -ROW_GAP + 40
  for (const [, p] of positions) {
    if (p.x === x) maxY = Math.max(maxY, p.y)
  }
  const pos = { x, y: maxY + ROW_GAP }
  positions.set(id, pos)
  return pos
}

const vfNodes = ref<VFNode[]>([])

// Reconcile vfNodes with the backend flow: add new nodes (assigning a position
// once), refresh the data of existing ones IN PLACE (keeping their position),
// and drop nodes that no longer exist. Never re-lays-out existing nodes.
function syncNodes() {
  // Plain record index (a typed Map.set on Vue Flow's deep Node generic trips
  // "excessively deep" inference).
  const byId: Record<string, VFNode> = {}
  for (const n of vfNodes.value) byId[n.id] = n
  const next: VFNode[] = []
  const keep = new Set<string>()

  // `saved` is a position persisted on the backend node ({x,y}); when present
  // it wins over the auto-layout so the user's arrangement is restored.
  const upsert = (
    id: string,
    type: string,
    column: keyof typeof COL,
    data: Record<string, unknown>,
    saved?: { x: number; y: number },
  ) => {
    keep.add(id)
    const existing = byId[id]
    if (existing) {
      existing.data = data // refresh data, keep selection
      // Adopt a saved position from the flow ONLY when we have not tracked a
      // local position for this id (i.e. the user hasn't dragged it this
      // session) — this re-syncs a server-normalised position after reload
      // without clobbering an in-progress local arrangement.
      if (saved && !positions.has(id)) {
        positions.set(id, { ...saved })
        existing.position = { ...saved }
      }
      next.push(existing)
    }
    else {
      // Seed the positions map from a saved position so later re-syncs keep it.
      if (saved && !positions.has(id)) positions.set(id, { ...saved })
      const position = saved ?? nextPosition(id, column)
      next.push({ id, type, position, data } as VFNode)
    }
  }

  for (const inp of props.flow.inputs) {
    upsert(`input:${inp.key}`, 'finput', 'input', { key: inp.key, label: inp.key, type: inp.type }, inp.position)
  }
  for (const n of props.flow.nodes) {
    const table = tablesById.value.get(n.table_id)
    upsert(`table:${n.node_id}`, 'ftable', 'table', {
      nodeId: n.node_id,
      tableTitle: table?.title ?? null,
      label: n.label ?? '',
      missing: !table,
      fields: (table?.fields ?? []).map((f) => ({ key: f.key, type: f.type })),
    }, n.position)
  }
  for (const o of props.flow.outputs) {
    upsert(`output:${o.name}`, 'foutput', 'output', { name: o.name, from_node: o.from_node, from_output: o.from_output }, o.position)
  }

  // Forget positions of removed nodes so a future node can reuse the slot.
  for (const id of positions.keys()) {
    if (!keep.has(id)) positions.delete(id)
  }

  vfNodes.value = next
}

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

// Edge removal (user selects one or more edges and deletes them).
// Edge ids encode their index in the source array (`e<i>` for flow.edges,
// `o<i>` for flow.outputs). We must collect ALL indices first and remove them
// in one pass — splicing per-id inside the loop would shift the remaining
// indices and delete the wrong entries when several edges go at once.
function onEdgesChange(changes: EdgeChange[]) {
  const removed = changes.filter((c) => c.type === 'remove').map((c) => c.id)
  if (removed.length === 0) return
  const flow = structuredClone(toRaw(props.flow)) as Flow

  const removeEdgeIdx = new Set<number>()
  const clearOutputIdx = new Set<number>()
  for (const id of removed) {
    const idx = Number(id.slice(1))
    if (Number.isNaN(idx)) continue
    if (id.startsWith('e')) removeEdgeIdx.add(idx)
    else if (id.startsWith('o')) clearOutputIdx.add(idx)
  }

  // Filter by original index — stable regardless of how many are removed.
  flow.edges = flow.edges.filter((_, i) => !removeEdgeIdx.has(i))
  // Clearing an output edge just unsets its source (keeps the output slot).
  for (const idx of clearOutputIdx) {
    if (flow.outputs[idx]) flow.outputs[idx].from_node = ''
  }

  emit('update:flow', flow)
}

// Track dragging so we persist a table node's position only once, when the
// drag ENDS. Vue Flow streams a `position` change every frame while dragging,
// but the FINAL end-of-drag change carries `dragging: false` and often NO
// `position` (it is only attached when the frame actually moved). So detect the
// end of drag on `dragging === false` alone — never gate it on `c.position`,
// or the persist step would never fire.
function onNodesChange(changes: NodeChange[]) {
  let dragEnded = false
  for (const c of changes) {
    if (c.type !== 'position') continue
    // Keep the live map in sync while dragging (position present each frame).
    if (c.position) positions.set(c.id, { x: c.position.x, y: c.position.y })
    if (c.dragging === false) dragEnded = true
  }
  if (dragEnded) persistNodePositions()
}

// Read the current canvas position for a Vue Flow node id, preferring Vue
// Flow's own findNode() (authoritative), falling back to our tracked map so a
// dropped position frame can't lose the final coordinates.
function currentPosition(id: string): CanvasPosition | undefined {
  return findNode(id)?.position ?? positions.get(id)
}

// Write the current canvas positions of ALL draggable elements (inputs, table
// nodes and outputs) back into the flow so they are saved and restored on
// reopen. Each element type carries its own persisted position (the Mongo
// backend stores it verbatim).
//
// Two passes so we never clone the flow for nothing (a plain click emits a
// dragging:false change with no movement): first collect the fresh positions
// and check whether any differs from what the flow already holds; only then
// clone and write. Emits update:flow only when something actually moved.
function persistNodePositions() {
  const elements: { id: string; pos: CanvasPosition; saved?: CanvasPosition }[] = []
  const collect = (id: string, saved?: CanvasPosition) => {
    const p = currentPosition(id)
    if (!p) return
    positions.set(id, { x: p.x, y: p.y })
    elements.push({ id, pos: p, saved })
  }

  for (const inp of props.flow.inputs) collect(`input:${inp.key}`, inp.position)
  for (const n of props.flow.nodes) collect(`table:${n.node_id}`, n.position)
  for (const o of props.flow.outputs) collect(`output:${o.name}`, o.position)

  const moved = new Set(
    elements
      .filter((e) => !e.saved || e.saved.x !== e.pos.x || e.saved.y !== e.pos.y)
      .map((e) => e.id),
  )
  if (moved.size === 0) return

  const flow = structuredClone(toRaw(props.flow)) as Flow
  const write = (id: string, target: { position?: CanvasPosition }) => {
    if (!moved.has(id)) return
    const p = positions.get(id)
    if (p) target.position = { x: p.x, y: p.y }
  }
  for (const inp of flow.inputs) write(`input:${inp.key}`, inp)
  for (const n of flow.nodes) write(`table:${n.node_id}`, n)
  for (const o of flow.outputs) write(`output:${o.name}`, o)

  emit('update:flow', flow)
}

// Rebuild the node set from the flow only when the STRUCTURE changes (a node,
// input or output added/removed, or a table's fields arriving) — not on every
// edge tweak, and never re-laying-out existing nodes. A structural signature
// keeps the watch from firing on unrelated flow mutations.
const structureKey = computed(() =>
  JSON.stringify({
    i: props.flow.inputs.map((x) => x.key),
    n: props.flow.nodes.map((x) => [x.node_id, x.table_id, x.label ?? '']),
    o: props.flow.outputs.map((x) => x.name),
    // include field counts so handles appear once table detail loads
    f: props.flow.nodes.map((x) => tablesById.value.get(x.table_id)?.fields?.length ?? 0),
  }),
)

watch(structureKey, () => {
  syncNodes()
  nextTick(() => updateNodeInternals())
}, { immediate: true })
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

.vf-node__heading {
  flex: 1;
  min-width: 0;
}

.vf-node__label {
  font-size: 10px;
  color: var(--ui-primary);
  font-style: italic;
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
  /* Do NOT transition/override `transform`: Vue Flow uses it to centre the
     handle on the node edge (translate ±50%). The hover affordance below uses
     box-shadow only, so the handle never shifts. */
  transition: box-shadow 0.1s ease, background 0.1s ease;
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

/* Hover affordance via a halo ring (box-shadow), NOT transform — so the handle
   stays centred on the node edge instead of jumping. */
:deep(.vue-flow__handle:hover) {
  box-shadow: 0 0 0 4px color-mix(in srgb, #3b82f6 35%, transparent);
}

:deep(.vf-handle--out:hover) {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--ui-primary) 35%, transparent);
}

:deep(.vue-flow__handle.connecting),
:deep(.vue-flow__handle.connectionindicator) {
  background: var(--ui-primary);
}

/* Highlight valid drop targets while dragging a connection. */
:deep(.vue-flow__handle-connecting) {
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--ui-primary) 45%, transparent);
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
