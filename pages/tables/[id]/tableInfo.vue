<template>
  <div>
    <!-- Breadcrumb -->
    <UBreadcrumb :items="breadcrumbs" class="mb-4" />

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
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
            icon="i-lucide-pencil"
            variant="outline"
          >
            {{ $t('common.edit') }}
          </UButton>
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            @click="confirmDelete"
          />
        </div>
      </div>

      <TableNav :table-id="tableId" :variants="table.variants" />

      <!-- Infos générales -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <UCard>
          <template #header>
            <h3 class="font-semibold">{{ $t('tables.configuration') }}</h3>
          </template>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-muted">{{ $t('tables.matchingType') }}</dt>
              <dd><UBadge variant="soft">{{ table.matching_type }}</UBadge></dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">{{ $t('tables.decisionType') }}</dt>
              <dd><UBadge variant="soft">{{ table.decision_type }}</UBadge></dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">{{ $t('tables.fields') }}</dt>
              <dd>{{ table.fields.length }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">{{ $t('tables.variants') }}</dt>
              <dd>{{ table.variants.length }}</dd>
            </div>
          </dl>
        </UCard>

        <UCard class="col-span-2">
          <template #header>
            <h3 class="font-semibold">{{ $t('tables.variants') }}</h3>
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
          <h3 class="font-semibold">{{ $t('tables.fields') }}</h3>
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

definePageMeta({ path: '/tables/:id/info', middleware: 'auth' })

const { t } = useI18n()
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
  { label: t('nav.tables'), to: '/tables' },
  { label: table.value?.title || tableId },
])


const fieldColumns = computed(() => [
  { accessorKey: 'key', header: t('fields.key') },
  { accessorKey: 'title', header: t('fields.title') },
  { accessorKey: 'type', header: t('fields.type') },
])

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
