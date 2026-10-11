<!-- Suppression d'une application par un superadmin (gandalf.api, ADMIN.md) :
     irréversible, elle emporte toutes ses tables. Le titre saisi confirme. -->
<template>
  <UModal :open="true" @update:open="(open: boolean) => { if (!open) emit('close') }">
    <template #header>
      <h3 class="text-base font-semibold">{{ $t('admin.deleteTitle', { title: project.title }) }}</h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <UAlert color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="$t('admin.deleteWarning')" />
        <UFormField :label="$t('admin.deleteTypeTitle', { title: project.title })" name="confirmation">
          <UInput v-model="confirmation" :disabled="loading" class="w-full" autofocus />
        </UFormField>
        <UAlert v-if="error" color="error" :description="error" />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton variant="ghost" :disabled="loading" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
        <UButton color="error" icon="i-lucide-trash-2" :loading="loading" :disabled="confirmation !== project.title" @click="onDelete">
          {{ $t('admin.delete') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { Project } from '~/types/project'

const props = defineProps<{ project: Project }>()
const emit = defineEmits<{ close: []; deleted: [projectId: string] }>()

const { t } = useI18n()
const gandalf = useGandalf()

const confirmation = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

async function onDelete() {
  if (confirmation.value !== props.project.title) return
  loading.value = true
  error.value = null
  try {
    await gandalf.projects.delete(props.project._id)
    emit('deleted', props.project._id)
  }
  catch {
    error.value = t('admin.deleteFailed')
  }
  finally {
    loading.value = false
  }
}
</script>
