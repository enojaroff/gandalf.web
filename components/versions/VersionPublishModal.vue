<!-- Publier un brouillon : il est figé et numéroté ; la version active ne change pas. -->
<template>
  <UModal :open="true" @update:open="(open: boolean) => { if (!open) emit('close') }">
    <template #header>
      <h3 class="text-base font-semibold">{{ $t('versions.publishTitle', { name: draft.name || '—' }) }}</h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">{{ $t('versions.publishHint') }}</p>
        <UAlert
          v-if="diverging"
          color="warning"
          variant="soft"
          icon="i-lucide-git-branch"
          :description="$t('versions.divergence', { number: diverging.number })"
        />
        <UFormField :label="$t('versions.comment')" :hint="$t('common.optional')">
          <UTextarea v-model="comment" class="w-full" :rows="3" maxlength="512" autofocus />
        </UFormField>
        <UAlert v-if="error" color="error" variant="soft" :description="error" />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton variant="ghost" :disabled="loading" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
        <UButton icon="i-lucide-stamp" :loading="loading" @click="onSubmit">{{ $t('versions.publish') }}</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { TableVersion, TableVersionSummary } from '~/types/version'
import { apiErrorCode, apiValidationMessages } from '~/utils/apiErrors'

const props = defineProps<{
  tableId: string
  draft: TableVersionSummary
  // Version active dont le brouillon ne descend pas (avertissement), le cas échéant
  diverging?: TableVersionSummary | null
}>()
const emit = defineEmits<{ close: []; published: [version: TableVersion] }>()

const { t } = useI18n()
const gandalf = useGandalf()
const comment = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

async function onSubmit() {
  if (loading.value) return
  loading.value = true
  error.value = null
  try {
    const response = await gandalf.tables.versions.publish(props.tableId, props.draft._id, comment.value.trim())
    emit('published', response.data)
    emit('close')
  }
  catch (e) {
    error.value = apiValidationMessages(e).join(' ') || apiErrorCode(e).message || t('errors.failedToSave')
  }
  finally { loading.value = false }
}
</script>
