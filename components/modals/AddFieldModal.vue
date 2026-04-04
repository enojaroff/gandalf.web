<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <h3 class="text-base font-semibold">{{ $t('tables.addField') }}</h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <UFormField :label="$t('fields.key')" name="key" required>
          <UInput v-model="form.key" placeholder="e.g. age, income_type" :disabled="loading" />
          <p class="text-xs text-muted mt-1">{{ $t('fields.keyHint') }}</p>
        </UFormField>

        <UFormField :label="$t('fields.title')" name="title">
          <UInput v-model="form.title" placeholder="Human-readable label" :disabled="loading" />
        </UFormField>

        <UFormField :label="$t('fields.type')" name="type">
          <USelect
            v-model="form.type"
            :items="fieldTypes"
            value-key="value"
            label-key="label"
            :disabled="loading"
          />
        </UFormField>

        <UAlert v-if="error" color="error" :description="error" />
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton variant="outline" :disabled="loading" @click="isOpen = false">{{ $t('common.cancel') }}</UButton>
        <UButton :loading="loading" @click="onAdd">{{ $t('tables.addField') }}</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { DecisionTable, DecisionField } from '~/types/decision-table'
import { objectId } from '~/utils/filters'

const props = defineProps<{
  table: DecisionTable
}>()

const emit = defineEmits<{
  add: [field: DecisionField]
}>()

const { t } = useI18n()
const isOpen = defineModel<boolean>('open', { default: false })

const form = reactive({
  key: '',
  title: '',
  type: 'string' as 'string' | 'numeric' | 'boolean',
})
const loading = ref(false)
const error = ref<string | null>(null)

const fieldTypes = computed(() => [
  { value: 'string', label: t('fields.types.string') },
  { value: 'numeric', label: t('fields.types.numeric') },
  { value: 'boolean', label: t('fields.types.boolean') },
])

function onAdd() {
  error.value = null

  if (!form.key.trim()) {
    error.value = t('fields.keyRequired')
    return
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(form.key)) {
    error.value = t('fields.keyInvalid')
    return
  }
  if (props.table.fields.some(f => f.key === form.key)) {
    error.value = t('fields.keyDuplicate')
    return
  }

  const newField: DecisionField = {
    _id: objectId(),
    key: form.key,
    title: form.title || form.key,
    type: form.type,
    source: 'request',
    preset: null,
  }

  isOpen.value = false
  emit('add', newField)
}
</script>
