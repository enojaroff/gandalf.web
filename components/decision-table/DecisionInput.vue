<template>
  <div>
    <UInput
      v-if="decisionType === 'alpha_num' || decisionType === 'string'"
      v-model="localValue"
      size="sm"
      :placeholder="placeholder"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <UInput
      v-else-if="decisionType === 'numeric'"
      v-model.number="localValue"
      type="number"
      size="sm"
      :placeholder="placeholder"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <UTextarea
      v-else-if="decisionType === 'json'"
      v-model="localValue"
      size="sm"
      :placeholder="placeholder"
      :rows="2"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <UInput
      v-else
      v-model="localValue"
      size="sm"
      :placeholder="placeholder"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { DecisionType } from '~/types/decision-table'

const props = defineProps<{
  modelValue: unknown
  decisionType: DecisionType
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
}>()

const localValue = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  localValue.value = val
})
</script>
