<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ $t('groups.title') }}</h1>
      <UButton to="/groups/create" icon="i-heroicons-plus">{{ $t('groups.new') }}</UButton>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-primary" />
    </div>

    <UCard v-else>
      <div v-if="groups.length === 0" class="text-center py-12">
        <UIcon name="i-heroicons-folder-open" class="text-5xl text-muted mb-4" />
        <p class="text-muted">{{ $t('groups.noGroups') }}</p>
        <UButton to="/groups/create" class="mt-4" icon="i-heroicons-plus">{{ $t('groups.createGroup') }}</UButton>
      </div>

      <UTable v-else :data="groups" :columns="columns">
        <template #title-cell="{ row }">
          <NuxtLink :to="`/groups/${row.original._id}`" class="font-medium text-primary hover:underline">
            {{ row.original.title }}
          </NuxtLink>
        </template>
        <template #tables-cell="{ row }">
          {{ row.original.tables?.length ?? 0 }} table{{ (row.original.tables?.length ?? 0) !== 1 ? 's' : '' }}
        </template>
        <template #actions-cell="{ row }">
          <UButton
            variant="ghost"
            icon="i-heroicons-trash"
            size="sm"
            color="error"
            @click="confirmDelete(row.original)"
          />
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { Group } from '~/types/group'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const gandalf = useGandalf()
const groups = ref<Group[]>([])
const loading = ref(true)

const columns = computed(() => [
  { accessorKey: 'title', header: t('common.name') },
  { accessorKey: 'tables', header: t('nav.tables') },
  { id: 'actions', header: '' },
])

onMounted(async () => {
  try {
    const response = await gandalf.groups.list()
    groups.value = response.data
  }
  finally {
    loading.value = false
  }
})

async function confirmDelete(group: Group) {
  if (!confirm(`Delete group "${group.title}"?`)) return
  try {
    await gandalf.groups.delete(group._id)
    groups.value = groups.value.filter(g => g._id !== group._id)
  }
  catch {
    // TODO: toast
  }
}
</script>
