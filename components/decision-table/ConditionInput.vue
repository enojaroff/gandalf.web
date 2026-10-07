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

    <!-- Champ date : date fixe ou relative à aujourd'hui, bornes empilées pour un intervalle -->
    <template v-else-if="field.type === 'date'">
      <USelect
        v-model="condition.condition"
        :items="operatorOptions"
        value-key="value"
        label-key="label"
        size="sm"
        class="w-32 self-start"
        @update:model-value="onOperatorChange"
      />
      <div v-if="!hasNoValue" class="flex flex-col gap-1">
        <template v-if="isBetween">
          <div class="flex items-center gap-1">
            <span class="text-muted text-xs w-6">{{ $t('dates.from') }}</span>
            <DecisionTableDateConditionValue v-model="dateFrom" />
          </div>
          <div class="flex items-center gap-1">
            <span class="text-muted text-xs w-6">{{ $t('dates.to') }}</span>
            <DecisionTableDateConditionValue v-model="dateTo" />
          </div>
        </template>
        <DecisionTableDateConditionValue
          v-else
          :model-value="condition.value"
          @update:model-value="(v: string) => { condition.value = v; emit('change') }"
        />
        <p v-if="dateError" class="text-error text-xs">{{ dateError }}</p>
      </div>
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
import { dayNumberToIso, isDateExpr, isValidDateCondition, toDayNumber, todayIso } from '~/utils/dateExpr'

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
  else if (props.field.type === 'date' && !isValidDateCondition(props.condition.condition, props.condition.value)) {
    // Valeur par défaut valide : aujourd'hui, ou les 30 derniers jours pour un intervalle
    props.condition.value = isBetween.value
      ? `${dayNumberToIso(toDayNumber('today-30d')!)};${todayIso()}`
      : todayIso()
  }
  emit('change')
}

// ── Champ date ───────────────────────────────────────────────────────────────
function dateBound(index: 0 | 1) {
  return computed({
    get: () => (typeof props.condition.value === 'string' ? props.condition.value.split(';')[index] ?? '' : ''),
    set: (bound: string) => {
      const bounds = typeof props.condition.value === 'string' ? props.condition.value.split(';') : []
      bounds[index] = bound
      props.condition.value = `${bounds[0] ?? ''};${bounds[1] ?? ''}`
      emit('change')
    },
  })
}
const dateFrom = dateBound(0)
const dateTo = dateBound(1)

const { t } = useI18n()

const dateError = computed(() => {
  const { condition, value } = props.condition
  if (isValidDateCondition(condition, value)) return ''
  if (isBetween.value && typeof value === 'string' && value.split(';').every(isDateExpr)) {
    return t('dates.rangeOrder')
  }
  return t('dates.invalid')
})

// Options d'opérateurs adaptées au type de champ
const operatorOptions = computed(() => {
  const all = [
    { value: '$any', label: 'any' },
    { value: '$is_set', label: 'is set' },
    { value: '$is_null', label: 'is null' },
    { value: '$eq', label: '=' },
    { value: '$ne', label: '≠' },
  ]

  // Les dates se comparent comme des nombres (avant / après, intervalles)
  if (props.field.type === 'numeric' || props.field.type === 'date') {
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
