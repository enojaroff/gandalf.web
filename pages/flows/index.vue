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
      <USelect
        v-if="categories.length"
        v-model="categoryFilter"
        :items="categoryFilterOptions"
        value-key="value"
        label-key="label"
        icon="i-lucide-tag"
        class="w-52"
        @update:model-value="onCategoryFilterChange"
      />
    </div>

    <!-- Commandes en masse (admin) : visibles dès qu'une ligne est sélectionnée -->
    <BulkActionsBar
      v-if="isAdmin"
      resource="flow"
      :count="selectedFlows.length"
      @copy="openBulk('copy')"
      @move="openBulk('move')"
      @clear="clearSelection"
    />

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
        <template #select-header>
          <UCheckbox
            :model-value="allSelectedState"
            aria-label="Sélectionner tous les flows"
            @update:model-value="(v: boolean | 'indeterminate') => toggleAll(v === true)"
          />
        </template>

        <template #select-cell="{ row }">
          <UCheckbox
            :model-value="isSelected(row.original._id)"
            :aria-label="`Sélectionner « ${row.original.title} »`"
            @update:model-value="(v: boolean | 'indeterminate') => toggleRow(row.original._id, v === true)"
          />
        </template>

        <template #title-cell="{ row }">
          <div>
            <div class="flex items-center gap-2">
              <NuxtLink
                :to="`/flows/${row.original._id}/edit`"
                class="font-medium text-primary hover:underline"
              >
                {{ row.original.title }}
              </NuxtLink>
              <CategoryBadge
                v-if="row.original.category_id && categoryById.get(row.original.category_id)"
                :name="categoryById.get(row.original.category_id)!.name"
                :color="categoryById.get(row.original.category_id)!.color"
                size="xs"
              />
            </div>
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

    <!-- Copier / déplacer vers un autre projet (admin) -->
    <CopyMoveModal
      v-if="copyMove"
      resource="flow"
      :mode="copyMove.mode"
      :items="copyMove.items"
      @close="copyMove = null"
      @saved="onCopyMoveSaved"
    />
  </div>
</template>

<script setup lang="ts">
import type { Flow } from '~/types/flow'
import type { Category } from '~/types/category'
import CategoryBadge from '~/components/categories/CategoryBadge.vue'
import CopyMoveModal from '~/components/modals/CopyMoveModal.vue'
import BulkActionsBar from '~/components/BulkActionsBar.vue'
import { useDebounceFn } from '@vueuse/core'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const gandalf = useGandalf()
const router = useRouter()
const toast = useToast()
const projectsStore = useProjectsStore()

// Copier/déplacer vers un autre projet — admin uniquement. `items` : un flow
// (menu de la ligne) ou la sélection (commandes en masse).
const isAdmin = computed(() => projectsStore.isAdmin)
const copyMove = ref<{ mode: 'copy' | 'move'; items: Flow[] } | null>(null)

const flows = ref<Flow[]>([])

// Sélection pour les commandes en masse (vidée par loadFlows)
const {
  selected: selectedFlows,
  allState: allSelectedState,
  isSelected,
  toggleRow,
  toggleAll,
  clear: clearSelection,
} = useRowSelection(flows)

function openBulk(mode: 'copy' | 'move') {
  // Copie figée de la sélection : la liste peut être rechargée pendant l'opération.
  copyMove.value = { mode, items: [...selectedFlows.value] }
}
const meta = ref<{ total: number } | null>(null)
const loading = ref(false)
const creating = ref(false)
const search = ref('')
const currentPage = ref(1)
const pageSize = 20

// Catégories de l'application, indexées par id pour résoudre la pastille en O(1).
const categories = ref<Category[]>([])
const categoryById = computed(
  () => new Map(categories.value.map(c => [c.id, c])),
)

// Filtre par catégorie. Sentinelle non-vide : @nuxt/ui (reka) réserve la chaîne
// vide comme "aucune sélection" et refuse un SelectItem de value ''.
const ALL_CATEGORIES = '__all__'
const categoryFilter = ref(ALL_CATEGORIES)
const categoryFilterOptions = computed(() => [
  { label: 'Toutes les catégories', value: ALL_CATEGORIES },
  ...categories.value.map(c => ({ label: c.name, value: c.id })),
])

async function loadCategories() {
  try {
    const response = await gandalf.categories.list()
    categories.value = response.data.categories
  }
  catch {
    categories.value = []
  }
}

function onCategoryFilterChange() {
  currentPage.value = 1
  loadFlows()
}

const columns = computed(() => [
  // Cases de sélection : seules les commandes admin (copier/déplacer) s'en servent
  ...(isAdmin.value ? [{ id: 'select', header: '' }] : []),
  { accessorKey: 'title', header: t('common.name') },
  { accessorKey: 'nodes', header: t('flows.nodesColumn') },
  { accessorKey: 'outputs', header: t('flows.outputsColumn') },
  { id: 'actions', header: '' },
])

async function loadFlows() {
  loading.value = true
  clearSelection()
  try {
    const response = await gandalf.flows.list(pageSize, currentPage.value, {
      title: search.value || undefined,
      category_id: categoryFilter.value !== ALL_CATEGORIES ? categoryFilter.value : undefined,
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

interface MenuItem {
  label: string
  icon: string
  color?: 'error'
  onSelect: () => void
}

function flowActions(flow: Flow): MenuItem[][] {
  const groups: MenuItem[][] = [
    [
      {
        label: t('common.edit'),
        icon: 'i-lucide-pencil',
        onSelect: () => { router.push(`/flows/${flow._id}/edit`) },
      },
      {
        label: t('flows.viewRuns'),
        icon: 'i-lucide-history',
        onSelect: () => { router.push(`/flows/${flow._id}/runs`) },
      },
    ],
  ]
  // Copier/déplacer : admin uniquement.
  if (isAdmin.value) {
    groups.push([
      {
        label: 'Copier vers…',
        icon: 'i-lucide-copy',
        onSelect: () => { copyMove.value = { mode: 'copy', items: [flow] } },
      },
      {
        label: 'Déplacer vers…',
        icon: 'i-lucide-corner-up-right',
        onSelect: () => { copyMove.value = { mode: 'move', items: [flow] } },
      },
    ])
  }
  groups.push([
    {
      label: t('common.delete'),
      icon: 'i-lucide-trash-2',
      color: 'error',
      onSelect: () => { confirmDelete(flow) },
    },
  ])
  return groups
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

// Après une copie/déplacement : recharger la liste (un déplacement retire le
// flow du projet courant).
function onCopyMoveSaved() {
  loadFlows()
}

onMounted(() => {
  loadCategories()
  loadFlows()
  if (projectsStore.currentUserRole === null) {
    projectsStore.fetchCurrentUserRole()
  }
})
</script>
