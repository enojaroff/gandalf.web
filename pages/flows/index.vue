<!-- Liste des flows (Decision Requirement Graph) -->
<template>
  <div>
    <!-- En-tête -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('flows.title') }}</h1>
        <p class="text-muted text-sm mt-1">
          {{ meta?.total ?? flows.length }} {{ (meta?.total ?? flows.length) !== 1 ? $t('flows.countPlural') : $t('flows.countSingular') }}
        </p>
      </div>
      <UButton icon="i-lucide-plus" :loading="creating" @click="createFlow">
        {{ $t('flows.new') }}
      </UButton>
    </div>

    <!-- Filtres -->
    <div class="flex gap-3 mb-4">
      <UInput
        v-model="search"
        :placeholder="$t('flows.searchPlaceholder')"
        icon="i-lucide-search"
        class="flex-1 max-w-sm"
        @input="debouncedSearch"
      />
    </div>

    <!-- Tableau -->
    <UCard class="shadow-md">
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
      </div>

      <div v-else-if="flows.length === 0" class="text-center py-12">
        <UIcon name="i-lucide-workflow" class="text-5xl text-muted mb-4" />
        <p class="text-muted">{{ $t('flows.noFlows') }}</p>
        <UButton class="mt-4" icon="i-lucide-plus" :loading="creating" @click="createFlow">
          {{ $t('flows.create') }}
        </UButton>
      </div>

      <UTable
        v-else
        sticky
        :data="flows"
        :columns="columns"
      >
        <template #title-cell="{ row }">
          <div>
            <NuxtLink
              :to="`/flows/${row.original._id}/edit`"
              class="font-medium text-primary hover:underline"
            >
              {{ row.original.title }}
            </NuxtLink>
            <p v-if="row.original.description" class="text-xs text-muted truncate max-w-xs">
              {{ row.original.description }}
            </p>
          </div>
        </template>

        <template #nodes-cell="{ row }">
          <UBadge variant="soft" size="sm">
            {{ row.original.nodes?.length ?? 0 }} {{ $t('flows.nodes') }}
          </UBadge>
        </template>

        <template #outputs-cell="{ row }">
          <span class="text-sm text-muted">
            {{ (row.original.outputs ?? []).map((o) => o.name).join(', ') || '—' }}
          </span>
        </template>

        <template #actions-cell="{ row }">
          <UDropdownMenu :items="flowActions(row.original)">
            <UButton variant="ghost" icon="i-lucide-ellipsis" size="sm" />
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
        @update:page="loadFlows"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Flow } from '~/types/flow'
import { useDebounceFn } from '@vueuse/core'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const gandalf = useGandalf()
const router = useRouter()
const toast = useToast()

const flows = ref<Flow[]>([])
const meta = ref<{ total: number } | null>(null)
const loading = ref(false)
const creating = ref(false)
const search = ref('')
const currentPage = ref(1)
const pageSize = 20

const columns = computed(() => [
  { accessorKey: 'title', header: t('common.name') },
  { accessorKey: 'nodes', header: t('flows.nodesColumn') },
  { accessorKey: 'outputs', header: t('flows.outputsColumn') },
  { id: 'actions', header: '' },
])

async function loadFlows() {
  loading.value = true
  try {
    const response = await gandalf.flows.list(pageSize, currentPage.value, {
      title: search.value || undefined,
    })
    flows.value = response.data
    meta.value = response.meta as { total: number }
  }
  catch {
    flows.value = []
    toast.add({ title: t('flows.loadError'), color: 'error' })
  }
  finally {
    loading.value = false
  }
}

const debouncedSearch = useDebounceFn(() => {
  currentPage.value = 1
  loadFlows()
}, 300)

// Create an empty flow and jump straight into the editor. The graph is built
// visually there; a minimal placeholder output keeps the initial save valid
// only once the user adds a node, so we do NOT save on create — we route to a
// fresh editor with an in-memory draft (see the editor's `id === 'new'` path).
function createFlow() {
  router.push('/flows/new/edit')
}

function flowActions(flow: Flow) {
  return [
    [
      {
        label: t('common.edit'),
        icon: 'i-lucide-pencil',
        onSelect: () => router.push(`/flows/${flow._id}/edit`),
      },
      {
        label: t('flows.viewRuns'),
        icon: 'i-lucide-history',
        onSelect: () => router.push(`/flows/${flow._id}/runs`),
      },
    ],
    [
      {
        label: t('common.delete'),
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => confirmDelete(flow),
      },
    ],
  ]
}

async function confirmDelete(flow: Flow) {
  if (!confirm(t('flows.deleteConfirm', { title: flow.title }))) return
  try {
    await gandalf.flows.delete(flow._id)
    toast.add({ title: t('flows.deleted'), color: 'success' })
    await loadFlows()
  }
  catch {
    toast.add({ title: t('flows.deleteError'), color: 'error' })
  }
}

onMounted(loadFlows)
</script>
