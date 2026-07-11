<!-- Onglet "Révisions" de la page de détail d'une table de décision -->
<template>
  <div>
    <UBreadcrumb :items="breadcrumbs" class="mb-4" />

    <div class="flex items-start justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">{{ table?.title }}</h1>
        <p v-if="table?.description" class="text-muted mt-1">{{ table.description }}</p>
      </div>
    </div>

      <TableNav :table-id="tableId" :variants="table?.variants" />

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
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
              icon="i-lucide-refresh-cw"
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
import type { DecisionTable } from '~/types/decision-table'

definePageMeta({ path: '/tables/:id/revisions', middleware: 'auth' })

const { t } = useI18n()
const route = useRoute()
const gandalf = useGandalf()
const tableId = route.params.id as string

const changelogs = ref<unknown[]>([])
const loading = ref(true)
const table = ref<DecisionTable | null>(null)

onMounted(async () => {
  try {
    const [changelogsResp, tableResp] = await Promise.all([
      gandalf.tables.getChangelogs(tableId),
      gandalf.tables.getById(tableId),
    ])
    changelogs.value = changelogsResp.data
    table.value = tableResp.data
  }
  finally {
    loading.value = false
  }
})

const breadcrumbs = computed(() => [
  { label: t('nav.tables'), to: '/tables' },
  { label: table.value?.title || tableId, to: `/tables/${tableId}/info` },
  { label: t('tables.revisions') },
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
