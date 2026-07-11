<template>
  <div class="max-w-xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <UButton to="/settings/project" variant="ghost" icon="i-lucide-arrow-left" size="sm" />
      <h1 class="text-2xl font-bold">{{ $t('settings.createApplication.title') }}</h1>
    </div>

    <UCard>
      <UForm :state="form" @submit="onSubmit">
        <UFormField :label="$t('settings.createApplication.nameLabel')" name="title" class="mb-4" required>
          <UInput
            v-model="form.title"
            :placeholder="$t('settings.createApplication.namePlaceholder')"
            :disabled="loading"
            class="inline-full"
          />
        </UFormField>

        <UFormField :label="$t('common.description')" name="description" class="mb-6">
          <UTextarea
            v-model="form.description"
            :placeholder="$t('settings.createApplication.descriptionPlaceholder')"
            :rows="3"
            :disabled="loading"
            class="inline-full"
          />
        </UFormField>

        <UAlert v-if="error" color="error" :description="error" class="mb-4" />

        <div class="flex gap-3 justify-end">
          <UButton to="/settings/project" variant="outline" :disabled="loading">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton type="submit" :loading="loading">
            {{ $t('common.create') }}
          </UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ path: '/settings/project/create', middleware: 'auth' })

const { t } = useI18n()
const gandalf = useGandalf()
const projectsStore = useProjectsStore()

const form = reactive({ title: '', description: '' })
const loading = ref(false)
const error = ref<string | null>(null)

async function onSubmit() {
  if (!form.title.trim()) {
    error.value = t('errors.required')
    return
  }

  loading.value = true
  error.value = null

  try {
    const resp = await gandalf.projects.create({ title: form.title, description: form.description })
    await projectsStore.fetchAll()
    projectsStore.selectProject(resp.data._id)
    await navigateTo('/tables')
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = e?.data?.message || t('errors.failedToCreate')
  }
  finally {
    loading.value = false
  }
}
</script>
