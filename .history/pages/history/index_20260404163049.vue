<template>
  <div>
    <!-- En-tête -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold">{{ $t('history.title') }}</h1>
      <p class="text-muted text-sm mt-1">{{ $t('history.subtitle') }}</p>
    </div>

    <!-- Filtre par table -->
    <div class="mb-4 max-w-sm">
      <UInput
        v-model="search"
        :placeholder="$t('history.searchPlaceholder')"
        icon="i-heroicons-magnifying-glass"
        @input="debouncedSearch"
      />
    </div>

    <!-- Tableau -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-primary" />
    </div>

    <UCard v-else>
      <div v-if="items.length === 0" class="text-center py-12 text-muted italic">
        {{ $t('history.noHistory') }}
      </div>

      <UTable v-else :data="items" :columns="columns" v-model:sorting="sorting">
        <!--- ID de la décision -->
        <template #_id-cell="{ row }">
          <NuxtLink :to="`/history/${row.original._id}`" class="font-mono text-xs text-primary hover:underline">
            {{ row.original._id.slice(-6) }}
          </NuxtLink>
        </template>

        <!-- Date d'exécution de la règle -->
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
<!--
          <div class="text-sm">
            <div><strong>{{ row.original.table?.title }}</strong></div>
            <div v-if="variantTitle(row.original)" class="text-xs text-muted">
              {{ variantTitle(row.original) }}
            </div>
          </div>
-->
          <div class="text-sm">
            <div><strong>{{ variantTitle(row.original) }}</strong></div>
            <div v-if="variantTitle(row.original)!= row.original.table?.title" class="text-xs text-muted">
              {{ row.original.table?.title }}
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
    <div v-if="meta && meta.total > pageSize" class="flex justify-center mt-4">
      <UPagination v-model:page="currentPage" :total="meta.total" :page-count="pageSize" @update:page="load" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { useDebounceFn } from '@vueuse/core'

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

const items = ref<HistoryItem[]>([])
const meta = ref<{ total: number } | null>(null)
const loading = ref(true)
const currentPage = ref(1)
const pageSize = 10
const search = ref('')
const sorting = ref<{ id: string; desc: boolean }[]>([])

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
// Liste des colonnes de la table dans l'ordre d'affichage
const columns = computed(() => [
  { accessorKey: 'created_at',    header: sortableHeader(t('history.date')) },
  { accessorKey: '_id',           header: sortableHeader(t('history.id')) },
//  { id: 'table_info', accessorFn: (row: HistoryItem) => row.table?.title ?? '', header: sortableHeader(t('history.tableInfo')) },
  { id: 'table_info', accessorFn: (row: HistoryItem) => row.table?.title ?? '', header: sortableHeader(t('history.tableName')) },
  { accessorKey: 'title',         header: sortableHeader(t('history.decisionName')) },
  { accessorKey: 'final_decision',header: sortableHeader(t('history.decision')) },
  { id: 'actions',                header: '',                        enableSorting: false },
])

async function load() {
  loading.value = true
  try {
    const response = await gandalf.history.list(undefined, pageSize, currentPage.value)
    const all = (response.data as HistoryItem[])
    if (search.value) {
      const q = search.value.toLowerCase()
      items.value = all.filter(i =>
        i.table?.title?.toLowerCase().includes(q) ||
        (i.variant?.title || i.table?.variant?.title || '').toLowerCase().includes(q) ||
        i.title?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i._id?.toLowerCase().includes(q) ||
        formatDate(i.created_at).toLowerCase().includes(q)
      )
    } else {
      items.value = all
    }
    meta.value = response.meta as { total: number }
  }
  finally { loading.value = false }
}

const debouncedSearch = useDebounceFn(() => {
  currentPage.value = 1
  load()
}, 300)

function variantTitle(item: HistoryItem): string {
//  return item.variant?.title || item.table?.variant?.title || ''
  return '' + (item.variant?.title || item.table?.variant?.title || item.table?.title)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

onMounted(load)
</script>
