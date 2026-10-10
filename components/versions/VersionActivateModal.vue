<!-- Activer une version publiée (mise en production). Avant de confirmer :
     l'avertissement de divergence, les clés d'API qui appellent la table sans
     préciser de version (leur comportement change) et les flows, qui gardent
     leur propre version de table. Après : proposer de mettre les flows à jour. -->
<template>
  <UModal :open="true" @update:open="(open: boolean) => { if (!open) emit('close') }">
    <template #header>
      <h3 class="text-base font-semibold">
        {{ activated ? $t('versions.activated', { number: version.number }) : $t('versions.activateTitle', { number: version.number }) }}
      </h3>
    </template>

    <template #body>
      <div v-if="loadingContext" class="flex justify-center py-6">
        <UIcon name="i-lucide-refresh-cw" class="animate-spin text-2xl text-primary" />
      </div>

      <div v-else class="space-y-4 text-sm">
        <template v-if="!activated">
          <p class="text-muted">{{ $t('versions.activateHint') }}</p>
          <UAlert
            v-if="diverging"
            color="warning"
            variant="soft"
            icon="i-lucide-git-branch"
            :description="$t('versions.divergence', { number: diverging.number })"
          />

          <section>
            <h4 class="font-semibold mb-1">{{ $t('versions.callersTitle', { days: windowDays }) }}</h4>
            <p v-if="!callers.length" class="text-muted">{{ $t('versions.noCallers') }}</p>
            <ul v-else class="list-disc pl-5">
              <li v-for="call in callers" :key="call.consumer">
                {{ call.description || call.consumer }}
                <span class="text-muted">· {{ $t('versions.callsCountLast', { count: call.count, date: formatDate(call.last_call_at) }) }}</span>
              </li>
            </ul>
          </section>

          <section>
            <h4 class="font-semibold mb-1">{{ $t('versions.flowsTitle') }}</h4>
            <p v-if="!flows.length" class="text-muted">{{ $t('versions.noFlows') }}</p>
            <template v-else>
              <p class="text-muted mb-1">{{ $t('versions.flowsStay') }}</p>
              <ul class="list-disc pl-5">
                <li v-for="flow in flows" :key="flow._id">{{ flow.title }}</li>
              </ul>
            </template>
          </section>
        </template>

        <template v-else>
          <p v-if="!outdated.length" class="text-muted">{{ $t('versions.flowsAllCurrent') }}</p>
          <template v-else>
            <template v-if="!updateResults.length">
              <p>{{ $t('versions.flowsOutdated', { count: outdated.length }) }}</p>
              <ul class="list-disc pl-5">
                <li v-for="flow in outdated" :key="flow._id">{{ flow.title }}</li>
              </ul>
            </template>
            <ul v-else class="space-y-1">
              <li v-for="result in updateResults" :key="result._id" class="flex items-start gap-2">
                <UBadge :color="result.status === 'incompatible' ? 'warning' : 'success'" variant="soft" size="sm">
                  {{ $t(`versions.flowStatus.${result.status}`) }}
                </UBadge>
                <span>
                  {{ result.title }}
                  <span v-if="result.errors.length" class="block text-xs text-muted">{{ result.errors.join(' ') }}</span>
                </span>
              </li>
            </ul>
          </template>
        </template>

        <UAlert v-if="error" color="error" variant="soft" :description="error" />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <template v-if="!activated">
          <UButton variant="ghost" :disabled="loading" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
          <UButton icon="i-lucide-rocket" :loading="loading" :disabled="loadingContext" @click="onActivate">
            {{ $t('versions.activate') }}
          </UButton>
        </template>
        <template v-else>
          <UButton variant="ghost" :disabled="loading" @click="emit('close')">{{ $t('common.close') }}</UButton>
          <UButton
            v-if="outdated.length && !updateResults.length && canUpdateFlows"
            icon="i-lucide-refresh-ccw"
            :loading="loading"
            @click="onUpdateFlows"
          >
            {{ $t('versions.updateFlows') }}
          </UButton>
        </template>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { FlowUpdateResult, TableFlowUsage, TableVersionSummary, VersionCall } from '~/types/version'
import { apiErrorCode, apiValidationMessages } from '~/utils/apiErrors'

const props = defineProps<{
  tableId: string
  version: TableVersionSummary
  diverging?: TableVersionSummary | null
}>()
const emit = defineEmits<{ close: []; activated: [] }>()

const { t } = useI18n()
const gandalf = useGandalf()
const projectsStore = useProjectsStore()

const loadingContext = ref(true)
const loading = ref(false)
const error = ref<string | null>(null)
const callers = ref<VersionCall[]>([])
const windowDays = ref(30)
const flows = ref<TableFlowUsage[]>([])
const activated = ref(false)
const outdated = ref<TableFlowUsage[]>([])
const updateResults = ref<FlowUpdateResult[]>([])

// Mettre les flows à jour les publie et les active : il faut les deux droits.
const canUpdateFlows = computed(() => projectsStore.can('tables_publish') && projectsStore.can('tables_activate'))

onMounted(async () => {
  try {
    const [callsResponse, flowsResponse] = await Promise.all([
      gandalf.tables.versions.calls(props.tableId).catch(() => null),
      gandalf.tables.versions.flows(props.tableId).catch(() => null),
    ])
    callers.value = (callsResponse?.data ?? []).filter(call => call.requested_version === null)
    windowDays.value = callsResponse?.meta?.window_days ?? 30
    flows.value = flowsResponse?.data ?? []
  }
  finally { loadingContext.value = false }
})

function formatDate(iso: string): string {
  const date = new Date(iso)
  return isNaN(date.getTime()) ? iso : date.toLocaleString()
}

async function onActivate() {
  if (loading.value) return
  loading.value = true
  error.value = null
  try {
    const response = await gandalf.tables.versions.activate(props.tableId, props.version._id)
    outdated.value = response.meta?.flows_outdated ?? []
    activated.value = true
    emit('activated')
  }
  catch (e) {
    error.value = apiValidationMessages(e).join(' ') || apiErrorCode(e).message || t('errors.failedToSave')
  }
  finally { loading.value = false }
}

async function onUpdateFlows() {
  if (loading.value) return
  loading.value = true
  error.value = null
  try {
    const response = await gandalf.tables.versions.updateFlows(props.tableId, {
      flow_ids: outdated.value.map(flow => flow._id),
      publish: true,
      activate: true,
    })
    updateResults.value = response.data
  }
  catch (e) {
    error.value = apiErrorCode(e).message || t('errors.failedToSave')
  }
  finally { loading.value = false }
}
</script>
