<template>
  <div>
    <UBreadcrumb :items="breadcrumbs" class="mb-4" />

    <div v-if="loadingTable" class="flex justify-center py-12">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
    </div>

    <template v-else-if="table">
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">{{ table.title }}</h1>
          <p v-if="table.description" class="text-muted mt-1">{{ table.description }}</p>
        </div>
      </div>

      <TableNav :table-id="tableId" :variants="table.variants" />

      <HistoryTable :table-id="tableId" />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { DecisionTable } from '~/types/decision-table'

definePageMeta({ path: '/tables/:id/history', middleware: 'auth' })

const { t } = useI18n()
const route = useRoute()
const gandalf = useGandalf()

const tableId = route.params.id as string
const table = ref<DecisionTable | null>(null)
const loadingTable = ref(true)

onMounted(async () => {
  try {
    const response = await gandalf.tables.getById(tableId)
    table.value = response.data
  }
  finally { loadingTable.value = false }
})

const breadcrumbs = computed(() => [
  { label: t('nav.tables'), to: '/tables' },
  { label: table.value?.title || tableId, to: `/tables/${tableId}/info` },
  { label: t('history.title') },
])

</script>
