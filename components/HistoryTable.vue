<template>
  <div>
    <!-- Filtre -->
    <div class="mb-4 max-w-sm">
      <UInput
        v-model="search"
        :placeholder="$t('history.searchPlaceholder')"
        icon="i-lucide-search"
      />
    </div>

    <!-- Chargement -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
    </div>

    <template v-else>
      <UCard>
        <div v-if="filteredItems.length === 0" class="text-center py-12 text-muted italic">
          {{ $t('history.noHistory') }}
        </div>

        <UTable
          v-else
          ref="tableRef"
          :data="filteredItems"
          :columns="columns"
          v-model:sorting="sorting"
          v-model:pagination="pagination"
          :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
        >
          <template #_id-cell="{ row }">
            <NuxtLink :to="`/history/${row.original._id}`" class="font-mono text-xs text-primary hover:underline">
              {{ row.original._id.slice(-6) }}
            </NuxtLink>
          </template>

          <template #created_at-cell="{ row }">
            {{ formatDate(row.original.created_at) }}
          </template>

          <template #title-cell="{ row }">
            <div>
              <div>{{ row.original.title }}</div>
              <div class="text-xs text-muted">{{ row.original.description }}</div>
            </div>
          </template>

          <template #final_decision-cell="{ row }">
            <UBadge variant="soft">{{ row.original.final_decision }}</UBadge>
          </template>

          <template #table_info-cell="{ row }">
            <div class="text-sm">
              <div><strong>{{ variantTitle(row.original) }}</strong></div>
              <div v-if="variantTitle(row.original) !== row.original.table?.title" class="text-xs text-muted">
                {{ row.original.table?.title }}
              </div>
            </div>
          </template>

          <template #actions-cell="{ row }">
            <UButton :to="`/history/${row.original._id}`" icon="i-lucide-eye" size="sm" color="primary" variant="outline" />
          </template>
        </UTable>
      </UCard>

      <!-- Pagination -->
      <div v-if="filteredItems.length > pagination.pageSize" class="flex justify-end mt-4">
        <UPagination
          :page="(tableRef?.tableApi?.getState().pagination.pageIndex ?? 0) + 1"
          :items-per-page="tableRef?.tableApi?.getState().pagination.pageSize"
          :total="tableRef?.tableApi?.getFilteredRowModel().rows.length"
          @update:page="(p) => tableRef?.tableApi?.setPageIndex(p - 1)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'

const props = defineProps<{ tableId?: string }>()

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

const tableRef = useTemplateRef('tableRef')
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
  { id: 'table_info', accessorFn: (row: HistoryItem) => row.table?.title ?? '', header: sortableHeader(t('history.tableInfo')) },
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

watch(search, () => { pagination.value.pageIndex = 0 })

async function load() {
  loading.value = true
  try {
    const response = await gandalf.history.list(props.tableId, 10000, 1)
    allItems.value = response.data as HistoryItem[]
  }
  finally { loading.value = false }
}

function variantTitle(item: HistoryItem): string {
  return item.variant?.title || item.table?.variant?.title || item.table?.title || ''
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

onMounted(load)
</script>
