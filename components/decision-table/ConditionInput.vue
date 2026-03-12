<template>
  <div class="flex gap-1 items-center">
    <!-- Sélecteur d'opérateur -->
    <USelect
      v-model="condition.condition"
      :items="operatorOptions"
      value-key="value"
      label-key="label"
      size="sm"
      class="w-32"
      @update:model-value="onOperatorChange"
    />

    <!-- Valeur (cachée pour is_set / is_null) -->
    <template v-if="!hasNoValue">
      <template v-if="field.type === 'boolean'">
        <DecisionTableBooleanSelect
          v-model="condition.value as boolean | null"
          size="sm"
          class="w-24"
          @update:model-value="emit('change')"
        />
      </template>
      <template v-else-if="isBetween">
        <!-- Opérateur $between / $not_between → deux valeurs -->
        <UInput
          v-model="betweenFrom"
          :type="field.type === 'numeric' ? 'number' : 'text'"
          size="sm"
          class="w-20"
          placeholder="from"
          @update:model-value="updateBetween"
        />
        <span class="text-muted text-xs">–</span>
        <UInput
          v-model="betweenTo"
          :type="field.type === 'numeric' ? 'number' : 'text'"
          size="sm"
          class="w-20"
          placeholder="to"
          @update:model-value="updateBetween"
        />
      </template>
      <template v-else>
        <UInput
          v-model="condition.value as string"
          :type="field.type === 'numeric' ? 'number' : 'text'"
          size="sm"
          class="w-28"
          @update:model-value="emit('change')"
        />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { DecisionField, RuleCondition } from '~/types/decision-table'
import { CONDITION_OPTIONS } from '~/utils/transforms'

const props = defineProps<{
  field: DecisionField
  condition: RuleCondition
}>()

const emit = defineEmits<{ change: [] }>()

const hasNoValue = computed(() =>
  CONDITION_OPTIONS.hasNotValue.includes(props.condition.condition ?? ''),
)

const isBetween = computed(() =>
  props.condition.condition === '$between'
  || props.condition.condition === '$not_between',
)

// Gestion de la valeur "between" comme tableau [from, to]
const betweenFrom = ref('')
const betweenTo = ref('')

watch(
  () => props.condition.value,
  (val) => {
    if (isBetween.value && Array.isArray(val)) {
      betweenFrom.value = String(val[0] ?? '')
      betweenTo.value = String(val[1] ?? '')
    }
  },
  { immediate: true },
)

function updateBetween() {
  const numType = props.field.type === 'numeric'
  props.condition.value = [
    numType ? Number(betweenFrom.value) : betweenFrom.value,
    numType ? Number(betweenTo.value) : betweenTo.value,
  ]
  emit('change')
}

function onOperatorChange() {
  if (hasNoValue.value) {
    props.condition.value = true
  }
  emit('change')
}

// Options d'opérateurs adaptées au type de champ
const operatorOptions = computed(() => {
  const all = [
    { value: '$is_set', label: 'is set' },
    { value: '$is_null', label: 'is null' },
    { value: '$eq', label: '=' },
    { value: '$ne', label: '≠' },
  ]

  if (props.field.type === 'numeric') {
    all.push(
      { value: '$gt', label: '>' },
      { value: '$gte', label: '≥' },
      { value: '$lt', label: '<' },
      { value: '$lte', label: '≤' },
      { value: '$between', label: 'between' },
      { value: '$not_between', label: 'not between' },
    )
  }

  if (props.field.type === 'string') {
    all.push(
      { value: '$contains', label: 'contains' },
      { value: '$not_contains', label: "doesn't contain" },
      { value: '$starts_with', label: 'starts with' },
      { value: '$ends_with', label: 'ends with' },
      { value: '$in', label: 'in list' },
      { value: '$nin', label: 'not in list' },
    )
  }

  return all
})
</script>
