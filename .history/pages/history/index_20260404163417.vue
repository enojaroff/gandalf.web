<template>
  <div>
    <!-- En-tête -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold">{{ $t('history.title') }}</h1>
      <p class="text-muted text-sm mt-1">{{ $t('history.subtitle') }}</p>
    </div>

    <!-- Filtre -->
    <div class="mb-4 max-w-sm">
      <UInput
        v-model="search"
        :placeholder="$t('history.searchPlaceholder')"
        icon="i-heroicons-magnifying-glass"
      />
    </div>

    <!-- Chargement -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-primary" />
    </div>

    <template v-else>
      <UCard>
        <div v-if="filteredItems.length === 0" class="text-center py-12 text-muted italic">
          {{ $t('history.noHistory') }}
        </div>

        <UTable
          v-else
          ref="table"
          :data="filteredItems"
          :columns="columns"
          v-model:sorting="sorting"
          v-model:pagination="pagination"
          :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
        >
          <!-- ID de la décision -->
          <template #_id-cell="{ row }">
            <NuxtLink :to="`/history/${row.original._id}`" class="font-mono text-xs text-primary hover:underline">
              {{ row.original._id.slice(-6) }}
            </NuxtLink>
          </template>

          <!-- Date -->
          <template #created_at-cell="{ row }">
            {{ formatDate(row.original.created_at) }}
          </template>

          <!-- Nom de la règle -->
          <template #title-cell="{ row }">
            <div>
              <div>{{ row.original.title }}</div>
              <div class="text-xs text-muted">{{ row.original.description }}</div>
            </div>
          </template>

          <!-- Décision -->
          <template #final_decision-cell="{ row }">
            <UBadge variant="soft">{{ row.original.final_decision }}</UBadge>
          </template>

          <!-- Nom de la table/variante -->
          <template #table_info-cell="{ row }">
            <div class="text-sm">
              <div><strong>{{ row.original.table?.title }}</strong></div>
              <div v-if="variantTitle(row.original)" class="text-xs text-muted">
                {{ variantTitle(row.original) }}
              </div>
            </div>
          </template>

          <!-- Lien vers détail -->
          <template #actions-cell="{ row }">
            <NuxtLink :to="`/history/${row.original._id}`" class="text-primary hover:underline text-sm">
              {{ $t('history.showDetails') }}
            </NuxtLink>
          </template>
        </UTable>
      </UCard>

      <!-- Pagination -->
      <div v-if="filteredItems.length > pagination.pageSize" class="flex justify-end mt-4">
        <UPagination
          :page="(table?.tableApi?.getState().pagination.pageIndex ?? 0) + 1"
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length"
          @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const gandalf = useGandalf()

interface HistoryItem {
  _id: string
  title: string
  description: string
  final_decision: string | number
  created_at: string
  table?: { _id: string; title: string; variant?: { _id: string; title: string } }
  variant?: { _id: string; title: string }
}

const table = useTemplateRef('table')
const allItems = ref<HistoryItem[]>([])
const loading = ref(true)
const search = ref('')
const sorting = ref<{ id: string; desc: boolean }[]>([])
const pagination = ref({ pageIndex: 0, pageSize: 20 })

const UButton = resolveComponent('UButton')

function sortableHeader(label: string) {
  return ({ column }: { column: { getIsSorted: () => string | false; toggleSorting: (desc: boolean) => void } }) => {
    const isSorted = column.getIsSorted()
    const icon = isSorted === 'asc'
      ? 'i-lucide-arrow-up-narrow-wide'
      : isSorted === 'desc'
        ? 'i-lucide-arrow-down-wide-narrow'
        : 'i-lucide-arrow-up-down'
    return h(UButton, {
      color: 'neutral',
      variant: 'ghost',
      label,
      icon,
      class: '-mx-2.5',
      onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
    })
  }
}

const columns = computed(() => [
  { accessorKey: 'created_at',     header: sortableHeader(t('history.date')) },
  { accessorKey: '_id',            header: sortableHeader(t('history.id')) },
  { id: 'table_info', accessorFn: (row: HistoryItem) => row.table?.title ?? '', header: sortableHeader(t('history.tableName')) },
  { accessorKey: 'title',          header: sortableHeader(t('history.decisionName')) },
  { accessorKey: 'final_decision', header: sortableHeader(t('history.decision')) },
  { id: 'actions',                 header: '', enableSorting: false },
])

const filteredItems = computed(() => {
  if (!search.value) return allItems.value
  const q = search.value.toLowerCase()
  return allItems.value.filter(i =>
    i.table?.title?.toLowerCase().includes(q) ||
    variantTitle(i).toLowerCase().includes(q) ||
    i.title?.toLowerCase().includes(q) ||
    i.description?.toLowerCase().includes(q) ||
    i._id?.toLowerCase().includes(q) ||
    formatDate(i.created_at).toLowerCase().includes(q)
  )
})

watch(search, () => {
  pagination.value.pageIndex = 0
})

async function load() {
  loading.value = true
  try {
    const response = await gandalf.history.list(undefined, 10000, 1)
    allItems.value = response.data as HistoryItem[]
  }
  finally { loading.value = false }
}


function variantTitle(item: HistoryItem): string {
  return item.variant?.title || item.table?.variant?.title || ''
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

onMounted(load)
</script>
