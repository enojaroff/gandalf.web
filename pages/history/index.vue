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

      <UTable v-else :data="items" :columns="columns">
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
            <div><strong>{{ row.original.table?.title }}</strong></div>
            <div v-if="variantTitle(row.original)" class="text-xs text-muted">
              {{ variantTitle(row.original) }}
            </div>
          </div>
        </template>

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
const pageSize = 20
const search = ref('')

const columns = computed(() => [
  { accessorKey: 'created_at',    header: t('history.date') },
  { accessorKey: '_id',           header: t('history.id') },
  { id: 'table_info',             header: t('history.tableInfo') },
  { accessorKey: 'title',         header: t('history.decisionName') },
  { accessorKey: 'final_decision',header: t('history.decision') },
  { id: 'actions',                header: '' },
])

async function load() {
  loading.value = true
  try {
    const response = await gandalf.history.list(undefined, pageSize, currentPage.value)
    const all = (response.data as HistoryItem[])
    items.value = search.value
      ? all.filter(i => i.table?.title?.toLowerCase().includes(search.value.toLowerCase()))
      : all
    meta.value = response.meta as { total: number }
  }
  finally { loading.value = false }
}

const debouncedSearch = useDebounceFn(() => {
  currentPage.value = 1
  load()
}, 300)

function variantTitle(item: HistoryItem): string {
  return item.variant?.title || item.table?.variant?.title || ''
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

onMounted(load)
</script>
