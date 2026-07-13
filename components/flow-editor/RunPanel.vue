<!--
  RunPanel — execute a flow and show its result + per-node trace.
  Builds an input form from flow.inputs, POSTs to /flows/{id}/decisions, and
  renders the assembled `answer` plus each node's decision. A 422 lists the
  wiring/validation errors and the flow_run_id when the run was partially
  recorded.
-->
<template>
  <USlideover v-model:open="isOpen" :title="$t('flows.runTitle')" :ui="{ content: 'max-w-xl' }">
    <template #body>
      <div class="space-y-6">
        <!-- Inputs form -->
        <div>
          <h3 class="text-sm font-semibold mb-2">{{ $t('flows.inputs') }}</h3>
          <div v-if="!flow.inputs.length" class="text-sm text-muted">
            {{ $t('flows.noInputsRun') }}
          </div>
          <div v-for="inp in flow.inputs" :key="inp.key" class="mb-3">
            <UFormField :label="`${inp.key} (${inp.type})`">
              <USelect
                v-if="inp.type === 'boolean'"
                v-model="inputValues[inp.key]"
                :items="boolOptions"
                class="w-full"
              />
              <UInput
                v-else
                v-model="inputValues[inp.key]"
                :type="inp.type === 'numeric' ? 'number' : 'text'"
                class="w-full"
              />
            </UFormField>
          </div>
          <UButton icon="i-lucide-play" :loading="running" block @click="run">
            {{ $t('flows.execute') }}
          </UButton>
        </div>

        <!-- Errors -->
        <UAlert
          v-if="errors.length"
          icon="i-lucide-alert-triangle"
          color="error"
          variant="soft"
          :title="$t('flows.runFailed')"
        >
          <template #description>
            <ul class="list-disc pl-5 space-y-1">
              <li v-for="(err, i) in errors" :key="i" class="text-sm">{{ err }}</li>
            </ul>
            <p v-if="failedRunId" class="text-xs mt-2 font-mono">flow_run_id: {{ failedRunId }}</p>
          </template>
        </UAlert>

        <!-- Result -->
        <template v-if="result">
          <div>
            <h3 class="text-sm font-semibold mb-2">{{ $t('flows.answer') }}</h3>
            <div class="space-y-2">
              <div
                v-for="(value, name) in result.answer"
                :key="name"
                class="flex items-center justify-between bg-elevated rounded px-3 py-2"
              >
                <span class="font-mono text-sm">{{ name }}</span>
                <div class="flex items-center gap-2">
                  <span class="font-semibold">{{ formatValue(value) }}</span>
                  <UBadge variant="soft" size="sm">{{ result.answer_types[name] }}</UBadge>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold mb-2">{{ $t('flows.nodeTrace') }}</h3>
            <div class="space-y-2">
              <UCard v-for="node in result.nodes" :key="node.node_id" :ui="{ body: 'p-3' }">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-mono text-sm font-semibold">{{ node.node_id }}</span>
                  <UBadge v-if="node.decision_id" variant="outline" size="sm">
                    {{ node.decision_id.slice(0, 8) }}…
                  </UBadge>
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span class="text-muted">{{ $t('flows.input') }}</span>
                    <pre class="mt-1 overflow-x-auto">{{ formatJson(node.input) }}</pre>
                  </div>
                  <div>
                    <span class="text-muted">{{ $t('flows.answer') }}</span>
                    <pre class="mt-1 overflow-x-auto">{{ formatJson(node.answer) }}</pre>
                  </div>
                </div>
              </UCard>
            </div>
          </div>

          <p class="text-xs text-muted font-mono">flow_run_id: {{ result.flow_run_id }}</p>
        </template>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { Flow, FlowResult } from '~/types/flow'

const props = defineProps<{
  flow: Flow
  open: boolean
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useI18n()
const gandalf = useGandalf()

const isOpen = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v),
})

const inputValues = reactive<Record<string, unknown>>({})
const running = ref(false)
const result = ref<FlowResult | null>(null)
const errors = ref<string[]>([])
const failedRunId = ref<string | null>(null)

const boolOptions = [
  { label: 'true', value: true },
  { label: 'false', value: false },
]

// Coerce numeric inputs from their string form before sending.
function buildPayload(): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const inp of props.flow.inputs) {
    const raw = inputValues[inp.key]
    if (inp.type === 'numeric') {
      payload[inp.key] = raw === '' || raw === undefined ? raw : Number(raw)
    }
    else {
      payload[inp.key] = raw
    }
  }
  return payload
}

async function run() {
  running.value = true
  errors.value = []
  failedRunId.value = null
  result.value = null
  try {
    const resp = await gandalf.flows.run(props.flow._id, buildPayload())
    result.value = resp.data
  }
  catch (e) {
    const body = (e as { data?: { data?: { errors?: string[]; flow_run_id?: string } } })?.data
    errors.value = body?.data?.errors ?? [t('flows.runGenericError')]
    failedRunId.value = body?.data?.flow_run_id ?? null
  }
  finally {
    running.value = false
  }
}

function formatValue(v: unknown): string {
  if (v === null) return 'null'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function formatJson(v: unknown): string {
  return JSON.stringify(v, null, 2)
}
</script>
