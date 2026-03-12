<template>
  <div>
    <UBreadcrumb :items="breadcrumbs" class="mb-4" />

    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold">Revisions</h2>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-primary" />
    </div>

    <UCard v-else>
      <div v-if="changelogs.length === 0" class="text-center py-8 text-muted">
        No revisions found.
      </div>

      <UTable v-else :data="changelogs" :columns="columns">
        <template #created_at-cell="{ row }">
          {{ formatDate((row.original as { created_at: string }).created_at) }}
        </template>

        <template #actions-cell="{ row }">
          <div class="flex gap-2">
            <UButton
              size="xs"
              variant="outline"
              icon="i-heroicons-arrow-path"
              @click="rollback(row.original as { _id: string })"
            >
              Rollback
            </UButton>
            <UButton
              size="xs"
              variant="ghost"
              :to="`/tables/${tableId}/diff?compare_with=${(row.original as { _id: string })._id}`"
            >
              Diff
            </UButton>
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const gandalf = useGandalf()
const tableId = route.params.id as string

const changelogs = ref<unknown[]>([])
const loading = ref(true)
const tableName = ref('')

onMounted(async () => {
  try {
    const [changelogsResp, tableResp] = await Promise.all([
      gandalf.tables.getChangelogs(tableId),
      gandalf.tables.getById(tableId),
    ])
    changelogs.value = changelogsResp.data
    tableName.value = tableResp.data.title
  }
  finally {
    loading.value = false
  }
})

const breadcrumbs = computed(() => [
  { label: 'Tables', to: '/tables' },
  { label: tableName.value || tableId, to: `/tables/${tableId}/info` },
  { label: 'Revisions' },
])

const columns = [
  { accessorKey: '_id', header: 'ID' },
  { accessorKey: 'created_at', header: 'Date' },
  { id: 'actions', header: '' },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

async function rollback(changelog: { _id: string }) {
  if (!confirm('Rollback to this revision?')) return
  try {
    await gandalf.tables.rollback(tableId, changelog._id)
    await navigateTo(`/tables/${tableId}/info`)
  }
  catch {
    // TODO: toast error
  }
}
</script>
