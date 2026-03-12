<template>
  <div>
    <h1 class="text-2xl font-bold text-center mb-2">Create your first project</h1>
    <p class="text-center text-muted text-sm mb-6">
      Projects contain your decision tables and settings.
    </p>

    <UForm :state="form" @submit="onSubmit">
      <UFormField label="Project Name" name="title" class="mb-4">
        <UInput
          v-model="form.title"
          placeholder="e.g. My Decision Engine"
          :disabled="loading"
        />
      </UFormField>

      <UFormField label="Description" name="description" class="mb-6">
        <UTextarea
          v-model="form.description"
          placeholder="Optional description"
          :disabled="loading"
          :rows="3"
        />
      </UFormField>

      <UAlert v-if="error" color="error" :description="error" class="mb-4" />

      <UButton type="submit" block :loading="loading">
        Create Project
      </UButton>
    </UForm>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'auth' })

const projectsStore = useProjectsStore()

const form = reactive({ title: '', description: '' })
const loading = ref(false)
const error = ref<string | null>(null)

async function onSubmit() {
  if (!form.title.trim()) {
    error.value = 'Project name is required.'
    return
  }

  loading.value = true
  error.value = null

  try {
    const gandalf = useGandalf()
    await gandalf.projects.create({ title: form.title, description: form.description })
    await projectsStore.fetchAll()
    await navigateTo('/tables')
  }
  catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Failed to create project.'
  }
  finally {
    loading.value = false
  }
}
</script>
