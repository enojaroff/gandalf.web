<template>
  <div class="flex gap-1 items-center">
    <!-- Champ boolean : sélecteur simplifié True/False -->
    <template v-if="field.type === 'boolean'">
      <USelect
        :model-value="booleanOption"
        :items="booleanOptions"
        value-key="value"
        label-key="label"
        size="sm"
        class="w-28"
        @update:model-value="onBooleanChange"
      />
    </template>

    <template v-else>
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

    <!-- Valeur (cachée pour is_set / is_null / any) -->
    <template v-if="!hasNoValue">
      <template v-if="isBetween">
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
    </template> <!-- end v-else (non-boolean) -->
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

// ── Boolean simplifié ────────────────────────────────────────────────────────
const booleanOptions = [
  { value: '$any',    label: 'any' },
  { value: '$is_set', label: 'is set' },
  { value: '$is_null',label: 'is null' },
  { value: 'true',    label: 'True' },
  { value: 'false',   label: 'False' },
]

const booleanOption = computed(() => {
  const op = props.condition.condition
  if (op === '$any' || op === '$is_set' || op === '$is_null') return op
  if (op === '$eq' && props.condition.value === false) return 'false'
  return 'true'
})

function onBooleanChange(val: string) {
  if (val === '$any' || val === '$is_set' || val === '$is_null') {
    props.condition.condition = val as '$any' | '$is_set' | '$is_null'
    props.condition.value = true
  } else {
    props.condition.condition = '$eq'
    props.condition.value = val === 'true'
  }
  emit('change')
}

const isBetween = computed(() =>
  props.condition.condition === '$between'
  || props.condition.condition === '$between_excl'
  || props.condition.condition === '$between_lexcl'
  || props.condition.condition === '$between_rexcl'
  || props.condition.condition === '$not_between',
)

// Gestion de la valeur "between" comme tableau [from, to]
const betweenFrom = ref('')
const betweenTo = ref('')

watch(
  () => props.condition.value,
  (val) => {
    if (!isBetween.value) return
    if (Array.isArray(val)) {
      betweenFrom.value = String(val[0] ?? '')
      betweenTo.value = String(val[1] ?? '')
    } else if (typeof val === 'string' && val.includes(';')) {
      const [a, b] = val.split(';')
      betweenFrom.value = a ?? ''
      betweenTo.value = b ?? ''
    }
  },
  { immediate: true },
)

function updateBetween() {
  const numType = props.field.type === 'numeric'
  const from = numType ? Number(betweenFrom.value) : betweenFrom.value
  const to = numType ? Number(betweenTo.value) : betweenTo.value
  props.condition.value = `${from};${to}`
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
    { value: '$any', label: 'any' },
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
      { value: '$between', label: '[x - y]' },
      { value: '$between_excl', label: ']x - y[' },
      { value: '$between_lexcl', label: ']x - y]' },
      { value: '$between_rexcl', label: '[x - y[' },
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
