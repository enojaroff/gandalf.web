<template>
  <div>
    <!-- Input dynamique selon le type de champ -->
    <UInput
      v-if="field.type === 'string'"
      v-model="localValue"
      :placeholder="field.key"
      size="sm"
      v-bind="$attrs"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <UInput
      v-else-if="field.type === 'numeric'"
      v-model.number="localValue"
      type="number"
      :placeholder="field.key"
      size="sm"
      v-bind="$attrs"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <DecisionTableBooleanSelect
      v-else-if="field.type === 'boolean'"
      v-model="localValue"
      size="sm"
      v-bind="$attrs"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <UInput
      v-else
      v-model="localValue"
      :placeholder="field.key"
      size="sm"
      v-bind="$attrs"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { DecisionField } from '~/types/decision-table'

const props = defineProps<{
  field: DecisionField
  modelValue: unknown
}>()

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
}>()

const localValue = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  localValue.value = val
})
</script>
