<template>
  <div>
    <!-- Breadcrumb -->
    <UBreadcrumb :items="breadcrumbs" class="mb-4" />

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-primary" />
    </div>

    <template v-else-if="table">
      <!-- En-tête -->
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">{{ table.title }}</h1>
          <p v-if="table.description" class="text-muted mt-1">{{ table.description }}</p>
        </div>
        <div class="flex gap-2">
          <UButton
            :to="`/tables/${table._id}/${table.variants[0]?._id}/edit`"
            icon="i-heroicons-pencil"
            variant="outline"
          >
            Edit
          </UButton>
          <UButton
            icon="i-heroicons-trash"
            color="error"
            variant="ghost"
            @click="confirmDelete"
          />
        </div>
      </div>

      <!-- Tabs de navigation -->
      <div class="flex gap-1 border-b border-default mb-6">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
          :class="route.path === tab.to
            ? 'border-primary text-primary'
            : 'border-transparent text-muted hover:text-default'"
        >
          {{ tab.label }}
        </NuxtLink>
      </div>

      <!-- Infos générales -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <UCard>
          <template #header>
            <h3 class="font-semibold">Configuration</h3>
          </template>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-muted">Matching type</dt>
              <dd><UBadge variant="soft">{{ table.matching_type }}</UBadge></dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">Decision type</dt>
              <dd><UBadge variant="soft">{{ table.decision_type }}</UBadge></dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">Fields</dt>
              <dd>{{ table.fields.length }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">Variants</dt>
              <dd>{{ table.variants.length }}</dd>
            </div>
          </dl>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-semibold">Variants</h3>
          </template>
          <ul class="space-y-2">
            <li
              v-for="variant in table.variants"
              :key="variant._id"
              class="flex items-center justify-between text-sm"
            >
              <NuxtLink
                :to="`/tables/${table._id}/${variant._id}/edit`"
                class="text-primary hover:underline font-medium"
              >
                {{ variant.title }}
              </NuxtLink>
              <span class="text-muted">
                {{ variant.rules.length }} rule{{ variant.rules.length !== 1 ? 's' : '' }}
                · {{ variant.probability }}%
              </span>
            </li>
          </ul>
        </UCard>
      </div>

      <!-- Champs -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">Fields</h3>
        </template>
        <UTable :data="table.fields" :columns="fieldColumns">
          <template #type-cell="{ row }">
            <UBadge variant="outline" size="sm">{{ row.original.type }}</UBadge>
          </template>
        </UTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { DecisionTable } from '~/types/decision-table'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const gandalf = useGandalf()

const tableId = route.params.id as string
const table = ref<DecisionTable | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const response = await gandalf.tables.getById(tableId)
    table.value = response.data
  }
  finally {
    loading.value = false
  }
})

const breadcrumbs = computed(() => [
  { label: 'Tables', to: '/tables' },
  { label: table.value?.title || tableId },
])

const tabs = computed(() => [
  { label: 'Info', to: `/tables/${tableId}/info` },
  { label: 'Revisions', to: `/tables/${tableId}/revisions` },
  ...(table.value?.variants.map(v => ({
    label: v.title,
    to: `/tables/${tableId}/${v._id}/edit`,
  })) || []),
])

const fieldColumns = [
  { accessorKey: 'key', header: 'Key' },
  { accessorKey: 'title', header: 'Title' },
  { accessorKey: 'type', header: 'Type' },
]

async function confirmDelete() {
  if (!table.value) return
  if (!confirm(`Delete table "${table.value.title}"?`)) return
  try {
    await gandalf.tables.delete(tableId)
    await navigateTo('/tables')
  }
  catch {
    // TODO: toast error
  }
}
</script>
