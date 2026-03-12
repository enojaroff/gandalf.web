<template>
  <div>
    <UBreadcrumb :items="breadcrumbs" class="mb-4" />
    <h2 class="text-xl font-bold mb-6">Revision Diff</h2>

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-primary" />
    </div>

    <div v-else-if="diff">
      <pre class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-xs overflow-auto max-h-96">{{ JSON.stringify(diff, null, 2) }}</pre>
    </div>

    <div v-else class="text-center py-8 text-muted">
      No diff data available.
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const gandalf = useGandalf()
const tableId = route.params.id as string
const compareWith = route.query.compare_with as string

const diff = ref<unknown>(null)
const loading = ref(true)
const tableName = ref('')

onMounted(async () => {
  try {
    const [diffResp, tableResp] = await Promise.all([
      gandalf.tables.getDiff(tableId, compareWith),
      gandalf.tables.getById(tableId),
    ])
    diff.value = diffResp.data
    tableName.value = tableResp.data.title
  }
  finally {
    loading.value = false
  }
})

const breadcrumbs = computed(() => [
  { label: 'Tables', to: '/tables' },
  { label: tableName.value || tableId, to: `/tables/${tableId}/info` },
  { label: 'Revisions', to: `/tables/${tableId}/revisions` },
  { label: 'Diff' },
])
</script>
