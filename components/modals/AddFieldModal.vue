<template>
  <UModal :open="true" @update:open="(v) => !v && emit('close')">
    <template #header>
      <h3 class="text-base font-semibold">Add Field</h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <UFormField label="Key" name="key" required>
          <UInput v-model="form.key" placeholder="e.g. age, income_type" :disabled="loading" />
          <p class="text-xs text-muted mt-1">Used in API requests. Lowercase, no spaces.</p>
        </UFormField>

        <UFormField label="Title" name="title">
          <UInput v-model="form.title" placeholder="Human-readable label" :disabled="loading" />
        </UFormField>

        <UFormField label="Type" name="type">
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
        <UButton variant="outline" :disabled="loading" @click="emit('close')">Cancel</UButton>
        <UButton :loading="loading" @click="onAdd">Add Field</UButton>
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
  close: []
  add: [field: DecisionField]
}>()

const form = reactive({
  key: '',
  title: '',
  type: 'string' as 'string' | 'numeric' | 'boolean',
})
const loading = ref(false)
const error = ref<string | null>(null)

const fieldTypes = [
  { value: 'string', label: 'String (text)' },
  { value: 'numeric', label: 'Numeric (number)' },
  { value: 'boolean', label: 'Boolean (true/false)' },
]

function onAdd() {
  error.value = null

  if (!form.key.trim()) {
    error.value = 'Field key is required.'
    return
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(form.key)) {
    error.value = 'Key must only contain letters, numbers, underscores, or hyphens.'
    return
  }
  if (props.table.fields.some(f => f.key === form.key)) {
    error.value = 'A field with this key already exists.'
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

  emit('add', newField)
}
</script>
