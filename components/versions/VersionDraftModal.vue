<!-- Créer un brouillon à partir d'une version (par défaut la version active). -->
<template>
  <UModal :open="true" @update:open="(open: boolean) => { if (!open) emit('close') }">
    <template #header>
      <h3 class="text-base font-semibold">{{ $t('versions.newDraft') }}</h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          {{ fromLabel ? $t('versions.newDraftFromHint', { version: fromLabel }) : $t('versions.newDraftHint') }}
        </p>
        <UFormField :label="$t('versions.draftName')" :hint="$t('common.optional')">
          <UInput v-model="name" class="w-full" maxlength="128" autofocus @keydown.enter="onSubmit" />
        </UFormField>
        <UAlert v-if="error" color="error" variant="soft" :description="error" />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton variant="ghost" :disabled="loading" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
        <UButton :loading="loading" @click="onSubmit">{{ $t('common.create') }}</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { TableVersion } from '~/types/version'
import { apiErrorCode, apiValidationMessages } from '~/utils/apiErrors'
import { defaultDraftName } from '~/utils/versions'

const props = defineProps<{
  tableId: string
  // Version d'origine ; absente : la version active
  fromVersionId?: string
  fromLabel?: string
}>()
const emit = defineEmits<{ close: []; created: [draft: TableVersion] }>()

const { t } = useI18n()
const gandalf = useGandalf()
const name = ref(defaultDraftName())
const loading = ref(false)
const error = ref<string | null>(null)

async function onSubmit() {
  if (loading.value) return
  loading.value = true
  error.value = null
  try {
    const response = await gandalf.tables.versions.create(props.tableId, {
      from_version_id: props.fromVersionId,
      name: name.value.trim(),
    })
    emit('created', response.data)
    emit('close')
  }
  catch (e) {
    error.value = apiValidationMessages(e).join(' ') || apiErrorCode(e).message || t('errors.failedToSave')
  }
  finally { loading.value = false }
}
</script>
