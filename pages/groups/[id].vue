<template>
  <div>
    <UBreadcrumb :items="breadcrumbs" class="mb-4" />

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-primary" />
    </div>

    <template v-else-if="group">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">{{ group.title }}</h1>
          <p v-if="group.description" class="text-muted mt-1">{{ group.description }}</p>
        </div>
        <div class="flex gap-2">
          <UButton variant="outline" icon="i-heroicons-plus" size="sm" @click="showAddTable = true">
            Add Table
          </UButton>
          <UButton variant="ghost" icon="i-heroicons-trash" color="error" @click="confirmDelete" />
        </div>
      </div>

      <UCard>
        <template #header><h3 class="font-semibold">Tables in this group</h3></template>
        <div v-if="!group.tables?.length" class="text-center py-8 text-muted">
          No tables assigned yet.
        </div>
        <UTable v-else :data="group.tables" :columns="columns">
          <template #title-cell="{ row }">
            <NuxtLink :to="`/tables/${row.original._id}/info`" class="text-primary hover:underline">{{ row.original.title }}</NuxtLink>
          </template>
        </UTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Group } from '~/types/group'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const gandalf = useGandalf()
const groupId = route.params.id as string

const group = ref<Group | null>(null)
const loading = ref(true)
const showAddTable = ref(false)

const columns = [
  { accessorKey: 'title', header: 'Table' },
]

onMounted(async () => {
  try {
    const response = await gandalf.groups.getById(groupId)
    group.value = response.data
  }
  finally { loading.value = false }
})

const breadcrumbs = computed(() => [
  { label: 'Groups', to: '/groups' },
  { label: group.value?.title || groupId },
])

async function confirmDelete() {
  if (!group.value || !confirm(`Delete group "${group.value.title}"?`)) return
  try {
    await gandalf.groups.delete(groupId)
    await navigateTo('/groups')
  }
  catch { /* TODO toast */ }
}
</script>
