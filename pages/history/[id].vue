<template>
  <div>
    <UBreadcrumb :items="[{ label: 'History', to: '/history' }, { label: id }]" class="mb-4" />
    <h2 class="text-xl font-bold mb-6">Decision Detail</h2>

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-primary" />
    </div>

    <template v-else-if="decision">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UCard>
          <template #header><h3 class="font-semibold">Request</h3></template>
          <pre class="text-xs overflow-auto max-h-64">{{ JSON.stringify(decision, null, 2) }}</pre>
        </UCard>
        <UCard>
          <template #header><h3 class="font-semibold">Rules evaluated</h3></template>
          <pre class="text-xs overflow-auto max-h-64">{{ JSON.stringify(decision, null, 2) }}</pre>
        </UCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const gandalf = useGandalf()
const id = route.params.id as string

const decision = ref<unknown>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const response = await gandalf.history.getById(id)
    decision.value = response.data
  }
  finally { loading.value = false }
})
</script>
