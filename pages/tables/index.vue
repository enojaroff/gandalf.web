<template>
  <div>
    <!-- En-tête -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">Decision Tables</h1>
        <p class="text-muted text-sm mt-1">
          {{ meta?.total ?? tables.length }} table{{ (meta?.total ?? tables.length) !== 1 ? 's' : '' }}
        </p>
      </div>
      <UButton to="/tables/create" icon="i-heroicons-plus">
        New Table
      </UButton>
    </div>

    <!-- Filtres -->
    <div class="flex gap-3 mb-4">
      <UInput
        v-model="search"
        placeholder="Search tables…"
        icon="i-heroicons-magnifying-glass"
        class="flex-1 max-w-sm"
        @input="debouncedSearch"
      />
    </div>

    <!-- Tableau -->
    <UCard>
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-primary" />
      </div>

      <div v-else-if="tables.length === 0" class="text-center py-12">
        <UIcon name="i-heroicons-table-cells" class="text-5xl text-muted mb-4" />
        <p class="text-muted">No tables yet. Create your first decision table.</p>
        <UButton to="/tables/create" class="mt-4" icon="i-heroicons-plus">
          Create Table
        </UButton>
      </div>

      <UTable
        v-else
        :data="tables"
        :columns="columns"
      >
        <template #title-cell="{ row }">
          <div>
            <NuxtLink
              :to="`/tables/${row.original._id}/info`"
              class="font-medium text-primary hover:underline"
            >
              {{ row.original.title }}
            </NuxtLink>
            <p v-if="row.original.description" class="text-xs text-muted truncate max-w-xs">
              {{ row.original.description }}
            </p>
          </div>
        </template>

        <template #matching_type-cell="{ row }">
          <UBadge variant="soft" size="sm">
            {{ row.original.matching_type }}
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <UDropdownMenu :items="tableActions(row.original)">
            <UButton variant="ghost" icon="i-heroicons-ellipsis-horizontal" size="sm" />
          </UDropdownMenu>
        </template>
      </UTable>
    </UCard>

    <!-- Pagination -->
    <div v-if="meta && meta.total > pageSize" class="flex justify-center mt-4">
      <UPagination
        v-model:page="currentPage"
        :total="meta.total"
        :page-count="pageSize"
        @update:page="loadTables"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DecisionTable } from '~/types/decision-table'
import { useDebounceFn } from '@vueuse/core'

definePageMeta({ middleware: 'auth' })

const gandalf = useGandalf()
const router = useRouter()

const tables = ref<DecisionTable[]>([])
const meta = ref<{ total: number } | null>(null)
const loading = ref(false)
const search = ref('')
const currentPage = ref(1)
const pageSize = 20

const columns = [
  { accessorKey: 'title', header: 'Name' },
  { accessorKey: 'matching_type', header: 'Matching' },
  { id: 'actions', header: '' },
]

async function loadTables() {
  loading.value = true
  try {
    const response = await gandalf.tables.list(pageSize, currentPage.value, {
      title: search.value || undefined,
    })
    tables.value = response.data
    meta.value = response.meta as { total: number }
  }
  catch {
    tables.value = []
  }
  finally {
    loading.value = false
  }
}

const debouncedSearch = useDebounceFn(() => {
  currentPage.value = 1
  loadTables()
}, 300)

function tableActions(table: DecisionTable) {
  return [
    [
      {
        label: 'View',
        icon: 'i-heroicons-eye',
        onSelect: () => router.push(`/tables/${table._id}/info`),
      },
      {
        label: 'Edit',
        icon: 'i-heroicons-pencil',
        onSelect: () => router.push(`/tables/${table._id}`),
      },
    ],
    [
      {
        label: 'Delete',
        icon: 'i-heroicons-trash',
        color: 'error' as const,
        onSelect: () => confirmDelete(table),
      },
    ],
  ]
}

async function confirmDelete(table: DecisionTable) {
  if (!confirm(`Delete table "${table.title}"?`)) return
  try {
    await gandalf.tables.delete(table._id)
    await loadTables()
  }
  catch {
    // TODO: toast error
  }
}

onMounted(loadTables)
</script>
