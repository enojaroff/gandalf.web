<!-- Listes des tables de décision -->
<template>
  <div>
    <!-- En-tête -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('tables.title') }}</h1>
        <p class="text-muted text-sm mt-1">
          {{ meta?.total ?? tables.length }} table{{ (meta?.total ?? tables.length) !== 1 ? 's' : '' }}
        </p>
      </div>
      <UButton to="/tables/create" icon="i-lucide-plus">
        {{ $t('tables.new') }}
      </UButton>
    </div>

    <!-- Filtres -->
    <div class="flex gap-3 mb-4">
      <UInput
        v-model="search"
        :placeholder="$t('tables.searchPlaceholder')"
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

    <!-- Tableau -->
    <UCard class="shadow-md">
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
      </div>

      <div v-else-if="tables.length === 0" class="text-center py-12">
        <UIcon name="i-lucide-table" class="text-5xl text-muted mb-4" />
        <p class="text-muted">{{ $t('tables.noTables') }} {{ $t('tables.noTablesCreate') }}</p>
        <UButton to="/tables/create" class="mt-4" icon="i-lucide-plus">
          {{ $t('tables.create') }}
        </UButton>
      </div>

      <UTable sticky
        v-else
        :data="tables"
        :columns="columns"
      >
        <template #title-cell="{ row }">
          <div>
            <div class="flex items-center gap-2">
              <NuxtLink
                :to="`/tables/${row.original._id}/info`"
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

        <template #matching_type-cell="{ row }">
          <UBadge variant="soft" size="sm">
            {{ row.original.matching_type }}
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <UDropdownMenu :items="tableActions(row.original)">
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
        @update:page="loadTables"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DecisionTable } from '~/types/decision-table'
import type { Category } from '~/types/category'
import CategoryBadge from '~/components/categories/CategoryBadge.vue'
import { useDebounceFn } from '@vueuse/core'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const gandalf = useGandalf()
const router = useRouter()

const tables = ref<DecisionTable[]>([])
const meta = ref<{ total: number } | null>(null)
const loading = ref(false)
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
  loadTables()
}

const columns = computed(() => [
  { accessorKey: 'title', header: t('common.name') },
  { accessorKey: 'matching_type', header: t('tables.matchingType') },
  { id: 'actions', header: '' },
])

async function loadTables() {
  loading.value = true
  try {
    const response = await gandalf.tables.list(pageSize, currentPage.value, {
      title: search.value || undefined,
      category_id: categoryFilter.value !== ALL_CATEGORIES ? categoryFilter.value : undefined,
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
        label: t('common.view'),
        icon: 'i-lucide-eye',
        onSelect: () => router.push(`/tables/${table._id}/info`),
      },
      {
        label: t('common.edit'),
        icon: 'i-lucide-pencil',
        onSelect: () => router.push(`/tables/${table._id}`),
      },
    ],
    [
      {
        label: t('common.delete'),
        icon: 'i-lucide-trash-2',
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

onMounted(() => {
  loadCategories()
  loadTables()
})
</script>
