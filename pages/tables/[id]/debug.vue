<!-- Tester une table : la version active, un brouillon ou une version publiée
     (?version=). Les exécutions passent par la route de test de l'API : elles
     sont marquées « test » et restent hors des analytics (VERSIONS.md). -->
<template>
  <div>
    <UBreadcrumb :items="breadcrumbs" class="mb-4" />
    <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
      <h2 class="text-xl font-bold">Test</h2>
      <UFormField :label="$t('versions.testVersion')" class="w-72">
        <USelect v-model="selectedVersion" :items="versionItems" class="w-full" />
      </UFormField>
    </div>
    <p class="text-xs text-muted mb-4">{{ $t('versions.testRunFlagged') }}</p>

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
            <div v-for="field in fields" :key="field._id">
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
                <UInput
                  v-else-if="field.type === 'date'"
                  v-model="testInput[field.key]"
                  type="date"
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
import type { DecisionField, DecisionTable } from '~/types/decision-table'
import type { TableVersionSummary } from '~/types/version'
import { generateCurlSample } from '~/utils/filters'
import { apiErrorCode, apiValidationMessages } from '~/utils/apiErrors'
import { sortVersions, versionNumberLabel } from '~/utils/versions'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const route = useRoute()
const gandalf = useGandalf()
const projectsStore = useProjectsStore()
const tableId = route.params.id as string

const ACTIVE = 'active'
const table = ref<DecisionTable | null>(null)
// Les champs de la version testée ; ceux de la table sont ceux de la version active
const fields = ref<DecisionField[]>([])
const versions = ref<TableVersionSummary[]>([])
const selectedVersion = ref<string>((route.query.version as string) || ACTIVE)
const loadingTable = ref(true)
const testInput = ref<Record<string, unknown>>({})
const testing = ref(false)
const result = ref<unknown>(null)
const testError = ref<string | null>(null)

// Exécuter un brouillon demande tables_update (gandalf.api, VERSIONS.md) ;
// une version publiée, decisions_make comme pour l'appeler.
const versionItems = computed(() => [
  { label: t('versions.testActive'), value: ACTIVE },
  ...versions.value.filter(v => v.status !== 'draft' || projectsStore.can('tables_update')).map(v => ({
    label: v.status === 'draft'
      ? `${t('versions.draft')} · ${v.name || '—'}`
      : `${versionNumberLabel(v)}${v.is_active ? ` (${t('versions.active')})` : ''}`,
    value: v._id,
  })),
])

// La version exécutée : celle choisie, ou la version active.
const runVersionId = computed(() =>
  selectedVersion.value === ACTIVE ? table.value?.active_version_id ?? null : selectedVersion.value,
)

onMounted(async () => {
  if (projectsStore.currentUserScopes === null) projectsStore.fetchCurrentUserRole()
  try {
    const [tableResponse, versionsResponse] = await Promise.all([
      gandalf.tables.getById(tableId),
      gandalf.tables.versions.list(tableId).catch(() => ({ data: [] as TableVersionSummary[] })),
    ])
    table.value = tableResponse.data
    versions.value = sortVersions(versionsResponse.data)
    await loadFields()
  }
  finally {
    loadingTable.value = false
  }
})

watch(selectedVersion, () => {
  result.value = null
  testError.value = null
  loadFields()
})

// Les champs du formulaire sont ceux de la version testée ; les valeurs déjà
// saisies sont gardées pour les champs qui restent. Seule la dernière version
// choisie compte quand les réponses arrivent dans le désordre.
let fieldsRequest = 0
async function loadFields() {
  if (!table.value) return
  const request = ++fieldsRequest
  const id = selectedVersion.value === ACTIVE ? null : selectedVersion.value
  const loaded = id ? (await gandalf.tables.versions.get(tableId, id)).data.fields : table.value.fields
  if (request !== fieldsRequest) return
  fields.value = loaded
  testInput.value = Object.fromEntries(loaded.map(f => [f.key, testInput.value[f.key] ?? null]))
}

const breadcrumbs = computed(() => [
  { label: 'Tables', to: '/tables' },
  { label: table.value?.title || tableId, to: `/tables/${tableId}/info` },
  { label: 'Test' },
])

const curlSample = computed(() => {
  if (!table.value) return ''
  const version = versions.value.find(v => v._id === selectedVersion.value)
  return generateCurlSample(
    tableId,
    fields.value.map(f => ({ key: f.key, type: f.type })),
    '/api',
    { version: version && version.status === 'published' && !version.is_active ? version.number : null },
  )
})

async function runTest() {
  testing.value = true
  result.value = null
  testError.value = null

  try {
    const versionId = runVersionId.value
    // Sans version (table antérieure aux versions) : appel direct de l'API.
    const response = versionId
      ? await gandalf.tables.versions.run(tableId, versionId, { data: testInput.value })
      : await gandalf.consumer.send(tableId, testInput.value)
    result.value = response.data
  }
  catch (err: unknown) {
    testError.value = apiValidationMessages(err).join(' ') || apiErrorCode(err).message || 'Request failed.'
  }
  finally {
    testing.value = false
  }
}
</script>
