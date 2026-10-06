<!-- Valeur d'une condition sur un champ date : date fixe, ou relative à aujourd'hui
     ("today-30d"). v-model porte la valeur au format de l'API (cf. utils/dateExpr). -->
<template>
  <div class="flex gap-1 items-center">
    <USelect
      :model-value="local.mode"
      :items="modeOptions"
      value-key="value"
      label-key="label"
      size="sm"
      class="w-32"
      @update:model-value="onModeChange"
    />
    <UInput
      v-if="local.mode === 'absolute'"
      v-model="local.date"
      type="date"
      size="sm"
      class="w-36"
      @update:model-value="emitValue"
    />
    <template v-else>
      <USelect
        v-model="local.sign"
        :items="signOptions"
        value-key="value"
        label-key="label"
        size="sm"
        class="w-14"
        @update:model-value="emitValue"
      />
      <UInput
        v-model.number="local.amount"
        type="number"
        min="0"
        size="sm"
        class="w-16"
        @update:model-value="emitValue"
        @blur="normalizeAmount"
      />
      <USelect
        v-model="local.unit"
        :items="unitOptions"
        value-key="value"
        label-key="label"
        size="sm"
        class="w-28"
        @update:model-value="emitValue"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { DateUnit } from '~/utils/dateExpr'
import { DATE_UNITS, formatRelative, isIsoDate, parseRelative, todayIso } from '~/utils/dateExpr'

const props = defineProps<{ modelValue: unknown }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()

// État local : garde le signe et l'unité choisis même quand le décalage vaut 0
// ("today" seul ne porte pas d'unité).
const local = reactive({
  mode: 'absolute' as 'absolute' | 'relative',
  date: '',
  sign: '-' as '-' | '+',
  amount: 0,
  unit: 'd' as DateUnit,
})

function serialize(): string {
  if (local.mode === 'absolute') return local.date
  const amount = Math.max(0, Math.trunc(Number(local.amount) || 0))
  return formatRelative({ offset: local.sign === '-' ? -amount : amount, unit: local.unit })
}

watch(
  () => props.modelValue,
  (value) => {
    // Écho de notre propre émission : ne pas écraser l'état local
    if (value === serialize()) return
    const rel = parseRelative(value)
    if (rel) {
      local.mode = 'relative'
      local.sign = rel.offset < 0 ? '-' : '+'
      local.amount = Math.abs(rel.offset)
      if (rel.offset) local.unit = rel.unit
    }
    else {
      local.mode = 'absolute'
      local.date = typeof value === 'string' && isIsoDate(value) ? value.trim().slice(0, 10) : ''
    }
  },
  { immediate: true },
)

function emitValue() {
  emit('update:modelValue', serialize())
}

// A negative or fractional amount is stored as its whole positive part: show it.
function normalizeAmount() {
  local.amount = Math.max(0, Math.trunc(Number(local.amount) || 0))
}

function onModeChange(mode: 'absolute' | 'relative') {
  local.mode = mode
  if (mode === 'absolute' && !local.date) local.date = todayIso()
  emitValue()
}

const modeOptions = computed(() => [
  { value: 'absolute', label: t('dates.absolute') },
  { value: 'relative', label: t('dates.today') },
])

const signOptions = [
  { value: '-', label: '−' },
  { value: '+', label: '+' },
]

const unitOptions = computed(() =>
  DATE_UNITS.map(unit => ({ value: unit, label: t(`dates.units.${unit}`) })),
)
</script>
