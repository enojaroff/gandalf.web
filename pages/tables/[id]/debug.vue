<template>
  <div>
    <UBreadcrumb :items="breadcrumbs" class="mb-4" />
    <h2 class="text-xl font-bold mb-6">Test</h2>

    <div v-if="loadingTable" class="flex justify-center py-12">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
    </div>

    <template v-else-if="table">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Input form -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">Test Input</h3>
          </template>

          <div class="space-y-4">
            <div v-for="field in table.fields" :key="field._id">
              <UFormField :label="`${field.title} (${field.key})`">
                <UInput
                  v-if="field.type === 'string'"
                  v-model="testInput[field.key]"
                  :placeholder="field.key"
                  class="w-full"
                />
                <UInput
                  v-else-if="field.type === 'numeric'"
                  v-model.number="testInput[field.key]"
                  type="number"
                  :placeholder="field.key"
                  class="w-full"
                />
                <USelect
                  v-else-if="field.type === 'boolean'"
                  v-model="testInput[field.key]"
                  :items="[{ label: 'True', value: true }, { label: 'False', value: false }, { label: 'null', value: null }]"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UButton block icon="i-lucide-play" :loading="testing" @click="runTest">
              Send
            </UButton>
          </div>
        </UCard>

        <!-- Result -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">Result</h3>
          </template>

          <div v-if="!result && !testError" class="text-center py-8 text-muted">
            Fill the form and click Send.
          </div>

          <UAlert v-else-if="testError" color="error" :description="testError" />

          <div v-else-if="result">
            <dl class="mb-4 space-y-2">
              <div>
                <dt class="text-sm text-muted">Final decision</dt>
                <dd class="text-2xl font-bold text-primary">{{ (result as any).final_decision }}</dd>
              </div>
              <div v-if="(result as any).title">
                <dt class="text-sm text-muted">Title</dt>
                <dd>{{ (result as any).title }}</dd>
              </div>
              <div v-if="(result as any).description">
                <dt class="text-sm text-muted">Description</dt>
                <dd>{{ (result as any).description }}</dd>
              </div>
            </dl>
            <pre class="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs overflow-auto max-h-64">{{ JSON.stringify(result, null, 2) }}</pre>
          </div>
        </UCard>
      </div>

      <!-- cURL sample -->
      <UCard class="mt-6">
        <template #header>
          <h3 class="font-semibold">Sample cURL</h3>
        </template>
        <pre class="text-xs overflow-auto whitespace-pre-wrap">{{ curlSample }}</pre>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { DecisionTable } from '~/types/decision-table'
import { generateCurlSample } from '~/utils/filters'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const gandalf = useGandalf()
const tableId = route.params.id as string

const table = ref<DecisionTable | null>(null)
const loadingTable = ref(true)
const testInput = ref<Record<string, unknown>>({})
const testing = ref(false)
const result = ref<unknown>(null)
const testError = ref<string | null>(null)

onMounted(async () => {
  try {
    const response = await gandalf.tables.getById(tableId)
    table.value = response.data
    testInput.value = Object.fromEntries(
      (response.data.fields || []).map(f => [f.key, null]),
    )
  }
  finally {
    loadingTable.value = false
  }
})

const breadcrumbs = computed(() => [
  { label: 'Tables', to: '/tables' },
  { label: table.value?.title || tableId, to: `/tables/${tableId}/info` },
  { label: 'Test' },
])

const curlSample = computed(() => {
  if (!table.value) return ''
  return generateCurlSample(
    tableId,
    table.value.fields.map(f => ({ key: f.key, type: f.type })),
  )
})

async function runTest() {
  testing.value = true
  result.value = null
  testError.value = null

  try {
    const response = await gandalf.consumer.send(tableId, testInput.value)
    result.value = response.data
  }
  catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    testError.value = fetchError?.data?.message || 'Request failed.'
  }
  finally {
    testing.value = false
  }
}
</script>
