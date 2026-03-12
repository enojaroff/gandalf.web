<template>
  <div class="max-w-xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <UButton to="/groups" variant="ghost" icon="i-heroicons-arrow-left" size="sm" />
      <h1 class="text-2xl font-bold">New Group</h1>
    </div>

    <UCard>
      <UForm :state="form" @submit="onSubmit">
        <UFormField label="Name" name="title" class="mb-4" required>
          <UInput v-model="form.title" placeholder="Group name" :disabled="loading" />
        </UFormField>

        <UFormField label="Description" name="description" class="mb-6">
          <UTextarea v-model="form.description" placeholder="Optional description" :rows="3" :disabled="loading" />
        </UFormField>

        <UAlert v-if="error" color="error" :description="error" class="mb-4" />

        <div class="flex gap-3 justify-end">
          <UButton to="/groups" variant="outline" :disabled="loading">Cancel</UButton>
          <UButton type="submit" :loading="loading">Create</UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const gandalf = useGandalf()
const form = reactive({ title: '', description: '' })
const loading = ref(false)
const error = ref<string | null>(null)

async function onSubmit() {
  if (!form.title.trim()) { error.value = 'Name is required.'; return }
  loading.value = true; error.value = null
  try {
    const resp = await gandalf.groups.create({ title: form.title, description: form.description })
    await navigateTo(`/groups/${resp.data._id}`)
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = e?.data?.message || 'Failed to create group.'
  }
  finally { loading.value = false }
}
</script>
