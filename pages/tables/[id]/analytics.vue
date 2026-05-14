<template>
  <div>
    <UBreadcrumb :items="breadcrumbs" class="mb-4" />

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
    </div>

    <template v-else-if="table && variant">
      <!-- Variant selector (if multiple variants) -->
      <div v-if="table.variants.length > 1" class="flex items-center gap-2 mb-4">
        <span class="text-sm text-muted">Variant:</span>
        <div class="flex gap-1">
          <UButton
            v-for="v in table.variants"
            :key="v._id"
            size="sm"
            :variant="selectedVariantId === v._id ? 'solid' : 'outline'"
            @click="selectedVariantId = v._id"
          >
            {{ v.title }}
          </UButton>
        </div>
      </div>

      <!-- Filter -->
      <div class="flex items-center gap-2 mb-3">
        <USwitch v-model="onlyActive" :label="$t('tables.onlyActiveRules')" />
      </div>

      <!-- Analytics table -->
      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="bg-muted/50 text-left">
              <th class="px-3 py-2 font-medium text-muted w-8 text-center">#</th>
              <th class="px-3 py-2 font-medium text-muted min-w-40">
                Title
                <div class="text-xs font-normal">description</div>
              </th>
              <th
                v-for="field in table.fields"
                :key="field._id"
                class="px-3 py-2 font-medium text-muted min-w-32 max-w-40"
              >
                <div class="truncate" :title="field.title">{{ field.title }}</div>
              </th>
              <th class="px-3 py-2 font-medium text-muted min-w-28 border-l border-default">Decision</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(rule, index) in filteredRules"
              :key="rule._id"
              class="border-t border-default"
            >
              <!-- Index -->
              <td class="px-3 py-2 text-center text-muted">{{ index }}</td>

              <!-- Title + description + probability -->
              <td
                class="px-3 py-2"
                :style="rule.probability != null ? probabilityStyle(rule.probability) : {}"
              >
                <div class="font-medium">
                  {{ rule.title }}
                  <span v-if="rule.probability != null" class="text-xs font-normal text-muted ml-1">
                    ({{ toFixed(rule.probability * 100, 1) }}%)
                  </span>
                </div>
                <div v-if="rule.description" class="text-xs text-muted">{{ rule.description }}</div>
              </td>

              <!-- Conditions -->
              <td
                v-for="condition in rule.conditions"
                :key="condition.field_key"
                class="px-3 py-2"
                :style="condition.condition !== '$any' && condition.probability != null
                  ? probabilityStyle(condition.probability)
                  : {}"
              >
                <div v-if="isBetween(condition.condition)">
                  {{ formatBetween(condition.condition, condition.value) }}
                </div>
                <div v-else-if="condition.condition === '$any'" class="text-muted italic text-xs">
                  any
                </div>
                <div v-else>
                  {{ formatCondition(condition.condition) }}&nbsp;{{ String(condition.value ?? '') }}
                </div>
                <div
                  v-if="condition.condition !== '$any' && condition.probability != null"
                  class="text-xs text-muted mt-0.5"
                >
                  {{ toFixed(condition.probability * 100, 1) }}%
                </div>
              </td>

              <!-- Decision + probability -->
              <td
                class="px-3 py-2 border-l border-default font-medium"
                :style="rule.probability != null ? probabilityStyle(rule.probability) : {}"
              >
                {{ rule.than }}
                <div v-if="rule.probability != null" class="text-xs font-normal text-muted mt-0.5">
                  {{ toFixed(rule.probability * 100, 1) }}%
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div v-else-if="!loading" class="text-center py-8 text-muted">
      No analytics data available yet.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DecisionTable, DecisionVariant, DecisionRule, RuleCondition } from '~/types/decision-table'

interface AnalyticsCondition extends RuleCondition {
  probability?: number
}

interface AnalyticsRule extends DecisionRule {
  probability?: number
  conditions: AnalyticsCondition[]
}

interface AnalyticsVariant extends DecisionVariant {
  rules: AnalyticsRule[]
}

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const gandalf = useGandalf()
const tableId = route.params.id as string

const table = ref<DecisionTable | null>(null)
const analyticsVariants = ref<Record<string, AnalyticsVariant>>({})
const loading = ref(true)
const selectedVariantId = ref<string>('')

const onlyActive = ref(false)

const variant = computed<AnalyticsVariant | null>(() => {
  if (!selectedVariantId.value) return null
  return analyticsVariants.value[selectedVariantId.value] ?? null
})

onMounted(async () => {
  try {
    const tableResp = await gandalf.tables.getById(tableId)
    table.value = tableResp.data
    if (tableResp.data.variants.length > 0) {
      selectedVariantId.value = tableResp.data.variants[0]!._id
      await loadAnalyticsForVariant(selectedVariantId.value)
    }
  }
  finally {
    loading.value = false
  }
})

watch(selectedVariantId, async (variantId) => {
  if (variantId && !analyticsVariants.value[variantId]) {
    await loadAnalyticsForVariant(variantId)
  }
})

async function loadAnalyticsForVariant(variantId: string) {
  try {
    const resp = await gandalf.tables.getAnalytics(tableId, variantId)
    const data = resp.data as { variants?: DecisionVariant[] }
    const analyticsVariant = data.variants?.find((v: AnalyticsVariant) => v._id === variantId)
      ?? data.variants?.[0]
    if (analyticsVariant) {
      analyticsVariants.value[variantId] = analyticsVariant as AnalyticsVariant
    }
  }
  catch {
    // no analytics data
  }
}

const filteredRules = computed(() => {
  if (!variant.value) return []
  if (!onlyActive.value) return variant.value.rules
  return variant.value.rules.filter(r => (r.probability ?? 0) > 0)
})

const breadcrumbs = computed(() => [
  { label: 'Tables', to: '/tables' },
  { label: table.value?.title || tableId, to: `/tables/${tableId}/info` },
  { label: 'Analytics' },
])

// --- Formatting helpers ---

const BETWEEN_FORMATS: Record<string, { open: string; close: string }> = {
  '$between':       { open: '[', close: ']' },
  '$between_excl':  { open: ']', close: '[' },
  '$between_lexcl': { open: ']', close: ']' },
  '$between_rexcl': { open: '[', close: '[' },
}

const CONDITION_LABELS: Record<string, string> = {
  '$eq': '=',
  '$ne': '≠',
  '$gt': '>',
  '$gte': '≥',
  '$lt': '<',
  '$lte': '≤',
  '$in': 'in',
  '$nin': 'not in',
  '$contains': 'contains',
  '$not_contains': 'not contains',
  '$starts_with': 'starts with',
  '$ends_with': 'ends with',
  '$is_set': 'is set',
  '$is_null': 'is null',
  '$any': 'any',
  '$not_between': 'not between',
}

function isBetween(condition: RuleCondition['condition']): boolean {
  return condition != null && condition in BETWEEN_FORMATS
}

function formatBetween(condition: RuleCondition['condition'], value: unknown): string {
  if (!condition) return String(value ?? '')
  const fmt = BETWEEN_FORMATS[condition]
  if (!fmt || value == null) return String(value ?? '')
  const parts = String(value).split(';')
  return `${fmt.open}${parts[0]} - ${parts[1]}${fmt.close}`
}

function formatCondition(condition: RuleCondition['condition']): string {
  if (!condition) return ''
  return CONDITION_LABELS[condition] ?? condition
}

function toFixed(n: number, decimals: number): string {
  return n.toFixed(decimals)
}
/*
const COLOR_LOW    = { r: 1,    g: 0.6,    b: 0.6 }  // red    — 0%
const COLOR_MID    = { r: 1,    g: 1,    b: 0.6 }  // yellow — 50%
const COLOR_HIGH   = { r: 0.6,    g: 1,  b: 0.6 }  // green  — 100%
*/
const COLOR_LOW    = { r: 1,       g: 0.65,    b: 0.65 }  // red    — 0%
const COLOR_MID    = { r: 0.95,    g: 0.9,     b: 0.6 }  // yellow — 50%
const COLOR_HIGH   = { r: 0.55,    g: 1,       b: 0.5 }  // green  — 100%

const COLOR_ALPHA  = 0.8

// Low=0% → Mid=50% → High=100%
function probabilityStyle(probability: number): Record<string, string> {
  const clamped = Math.max(0, Math.min(1, probability))
  let r: number, g: number, b: number
  if (clamped <= 0.5) {
    const t = clamped * 2
    r = COLOR_LOW.r + t * (COLOR_MID.r - COLOR_LOW.r)
    g = COLOR_LOW.g + t * (COLOR_MID.g - COLOR_LOW.g)
    b = COLOR_LOW.b + t * (COLOR_MID.b - COLOR_LOW.b)
  } else {
    const t = (clamped - 0.5) * 2
    r = COLOR_MID.r + t * (COLOR_HIGH.r - COLOR_MID.r)
    g = COLOR_MID.g + t * (COLOR_HIGH.g - COLOR_MID.g)
    b = COLOR_MID.b + t * (COLOR_HIGH.b - COLOR_MID.b)
  }
  return {
    backgroundColor: `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${COLOR_ALPHA})`,
  }
}
</script>
