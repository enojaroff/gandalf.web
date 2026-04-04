<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('history.title') }}</h1>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-primary" />
    </div>

    <UCard v-else>
      <div v-if="items.length === 0" class="text-center py-12 text-muted">
        {{ $t('history.noHistory') }}
      </div>

      <UTable v-else :data="items" :columns="columns">
        <template #_id-cell="{ row }">
          <NuxtLink :to="`/history/${(row.original as { _id: string })._id}`" class="font-mono text-xs text-primary hover:underline">
            {{ (row.original as { _id: string })._id }}
          </NuxtLink>
        </template>
        <template #created_at-cell="{ row }">
          {{ formatDate((row.original as { created_at: string }).created_at) }}
        </template>
      </UTable>
    </UCard>

    <div v-if="meta && meta.total > pageSize" class="flex justify-center mt-4">
      <UPagination v-model:page="currentPage" :total="meta.total" :page-count="pageSize" @update:page="load" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const gandalf = useGandalf()
const items = ref<unknown[]>([])
const meta = ref<{ total: number } | null>(null)
const loading = ref(true)
const currentPage = ref(1)
const pageSize = 20

const columns = computed(() => [
  { accessorKey: '_id', header: t('history.id') },
  { accessorKey: 'table_id', header: t('history.table') },
  { accessorKey: 'created_at', header: t('history.date') },
])

async function load() {
  loading.value = true
  try {
    const response = await gandalf.history.list(undefined, pageSize, currentPage.value)
    items.value = response.data
    meta.value = response.meta as { total: number }
  }
  finally { loading.value = false }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

onMounted(load)
</script>
