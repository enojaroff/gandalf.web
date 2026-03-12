<template>
  <span class="text-sm">
    <template v-if="field.type === 'boolean'">
      <UBadge :color="value ? 'success' : 'error'" variant="soft" size="xs">
        {{ value ? 'True' : 'False' }}
      </UBadge>
    </template>
    <template v-else-if="value === null || value === undefined">
      <span class="text-muted italic">—</span>
    </template>
    <template v-else>
      {{ value }}
    </template>
  </span>
</template>

<script setup lang="ts">
import type { DecisionField } from '~/types/decision-table'

defineProps<{
  field: DecisionField
  value: unknown
}>()
</script>
