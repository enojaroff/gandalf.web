<template>
  <div>
    <UBreadcrumb :items="breadcrumbs" class="mb-4" />
    <h2 class="text-xl font-bold mb-6">Analytics</h2>

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-primary" />
    </div>

    <div v-else-if="analytics">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <UCard>
          <div class="text-center">
            <p class="text-3xl font-bold text-primary">{{ analytics.total_decisions ?? 0 }}</p>
            <p class="text-muted text-sm mt-1">Total Decisions</p>
          </div>
        </UCard>
      </div>

      <!-- Détail par règle -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">Rules Analytics</h3>
        </template>
        <pre class="text-xs overflow-auto max-h-96">{{ JSON.stringify(analytics, null, 2) }}</pre>
      </UCard>
    </div>

    <div v-else class="text-center py-8 text-muted">
      No analytics data available yet.
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const gandalf = useGandalf()
const tableId = route.params.id as string
const variantId = route.params.variantId as string

const analytics = ref<unknown>(null)
const loading = ref(true)
const tableName = ref('')

onMounted(async () => {
  try {
    const [analyticsResp, tableResp] = await Promise.all([
      gandalf.tables.getAnalytics(tableId, variantId),
      gandalf.tables.getById(tableId),
    ])
    analytics.value = analyticsResp.data
    tableName.value = tableResp.data.title
  }
  finally {
    loading.value = false
  }
})

const breadcrumbs = computed(() => [
  { label: 'Tables', to: '/tables' },
  { label: tableName.value || tableId, to: `/tables/${tableId}/info` },
  { label: 'Analytics' },
])
</script>
