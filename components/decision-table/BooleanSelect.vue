<template>
  <USelect
    v-model="modelValue"
    :items="options"
    value-key="value"
    label-key="label"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
const modelValue = defineModel<boolean | null>()

const options = [
  { label: '—', value: null },
  { label: 'True', value: true },
  { label: 'False', value: false },
]
</script>
