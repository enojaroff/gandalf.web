<!-- Dupliquer, modifier ou supprimer une variante de table (page d'info d'une
     table). La page fournit `submit`, qui applique l'opération et enregistre la
     table ; la modale gère la saisie, l'attente et les erreurs. -->
<template>
  <UModal :open="true" @update:open="(open: boolean) => { if (!open) emit('close') }">
    <template #header>
      <h3 class="text-base font-semibold">{{ heading }}</h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <template v-if="mode === 'delete'">
          <p class="text-sm">{{ $t('tables.variantDeleteConfirm', { title: variant.title }) }}</p>
        </template>

        <template v-else>
          <p v-if="mode === 'copy'" class="text-sm text-muted">
            {{ $t('tables.variantCopyHint', { title: variant.title }) }}
          </p>
          <UFormField :label="$t('common.name')" :error="titleError" required>
            <UInput v-model="title" class="w-full" maxlength="128" autofocus @keydown.enter="onSubmit" />
          </UFormField>
          <UFormField :label="$t('common.description')" :hint="$t('common.optional')" :error="descriptionError">
            <UInput v-model="description" class="w-full" maxlength="128" @keydown.enter="onSubmit" />
          </UFormField>
        </template>

        <UAlert v-if="error" color="error" variant="soft" :description="error" />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton variant="ghost" :disabled="loading" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
        <UButton
          :color="mode === 'delete' ? 'error' : 'primary'"
          :loading="loading"
          :disabled="invalid"
          @click="onSubmit"
        >
          {{ submitLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { DecisionVariant } from '~/types/decision-table'
import type { VariantInfo } from '~/utils/tableVariants'
import { apiErrorMessage, apiValidationMessages } from '~/utils/apiErrors'

const props = defineProps<{
  mode: 'copy' | 'edit' | 'delete'
  variant: DecisionVariant
  // Applique l'opération et enregistre la table ; rejette si l'API refuse.
  submit: (info: VariantInfo) => Promise<void>
}>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()

const title = ref(props.mode === 'copy'
  ? t('tables.variantCopyName', { title: props.variant.title })
  : props.variant.title)
const description = ref(props.variant.description ?? '')
const loading = ref(false)
const error = ref<string | null>(null)

const heading = computed(() => ({
  copy: t('tables.variantCopyTitle', { title: props.variant.title }),
  edit: t('tables.variantEdit'),
  delete: t('tables.variantDelete'),
})[props.mode])

const submitLabel = computed(() => ({
  copy: t('common.create'),
  edit: t('common.save'),
  delete: t('common.delete'),
})[props.mode])

// Mêmes bornes que l'API (TableRulesProvider) : nom de 2 à 128 caractères,
// description vide ou de 2 à 128.
const titleError = computed(() => {
  const length = title.value.trim().length
  return length < 2 || length > 128 ? t('tables.variantNameLength') : undefined
})
const descriptionError = computed(() => {
  const length = description.value.trim().length
  return length === 1 || length > 128 ? t('tables.variantDescriptionLength') : undefined
})
const invalid = computed(() => props.mode !== 'delete' && !!(titleError.value || descriptionError.value))

async function onSubmit() {
  if (invalid.value || loading.value) return
  loading.value = true
  error.value = null
  try {
    await props.submit({ title: title.value.trim(), description: description.value.trim() })
    emit('close')
  }
  catch (e) {
    error.value = apiValidationMessages(e).join(' ') || apiErrorMessage(e) || t('errors.failedToSave')
  }
  finally { loading.value = false }
}
</script>
