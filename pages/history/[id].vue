<!-- Détail d'une décision de l'historique : requête reçue et évaluation de chaque
     règle de la table telle qu'elle était au moment de la décision -->
<template>
  <div>
    <!-- En-tête à la largeur standard ; seul le tableau d'évaluation occupe toute la fenêtre -->
    <UContainer>
      <UBreadcrumb :items="breadcrumbs" class="mb-4" />
      <h2 class="text-xl font-bold mb-6">{{ $t('history.detail') }}</h2>

      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
      </div>

      <template v-else-if="decision">
        <!-- Table, variante et date de la décision -->
        <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt class="text-muted">{{ $t('history.tableName') }}</dt>
            <dd>
              <NuxtLink :to="`/tables/${decision.table._id}/info`" class="text-primary hover:underline">
                {{ decision.table.title }}
              </NuxtLink>
            </dd>
            <dt class="text-muted">{{ $t('history.tableVariant') }}</dt>
            <dd>{{ decision.table.variant?.title }}</dd>
            <dt class="text-muted">{{ $t('history.date') }}</dt>
            <dd>{{ new Date(decision.created_at).toLocaleString() }}</dd>
          </dl>
          <UButton
            v-if="decision.table.variant"
            icon="i-lucide-pencil"
            variant="outline"
            size="sm"
            :to="`/tables/${decision.table._id}/${decision.table.variant._id}/edit`"
          >
            {{ $t('common.edit') }}
          </UButton>
        </div>

        <!-- Requête reçue -->
        <h3 class="font-semibold mb-2">{{ $t('history.request') }}</h3>
        <pre class="text-xs overflow-auto max-h-64 rounded-lg border border-default bg-muted/50 p-3 mb-6">{{ JSON.stringify(decision.request, null, 2) }}</pre>
      </template>
    </UContainer>

    <UContainer v-if="decision" class="max-w-none">
      <!-- Évaluation des règles : vert = condition vérifiée, rouge = non vérifiée ;
           la colonne Décision est verte quand toute la règle a matché -->
      <h3 class="font-semibold mb-2">{{ $t('history.rulesEvaluation') }}</h3>
      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="bg-muted/50 text-left">
              <th class="px-3 py-2 font-medium text-muted w-8 text-center">#</th>
              <th class="px-3 py-2 font-medium text-muted min-w-40">
                {{ $t('history.rule') }}
                <div class="text-xs font-normal">{{ $t('common.description') }}</div>
              </th>
              <th
                v-for="field in fields"
                :key="field.key"
                class="px-3 py-2 font-medium text-muted min-w-32 max-w-40"
              >
                <div class="truncate" :title="field.title">{{ field.title }}</div>
              </th>
              <th class="px-3 py-2 font-medium text-muted min-w-28 border-l border-default">
                {{ $t('history.decision') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in rows" :key="index" class="border-t border-default">
              <td class="px-3 py-2 text-center text-muted">{{ index }}</td>
              <td class="px-3 py-2">
                <div class="font-medium">{{ row.title }}</div>
                <div v-if="row.description" class="text-xs text-muted">{{ row.description }}</div>
              </td>
              <td
                v-for="(cell, cellIndex) in row.cells"
                :key="cellIndex"
                class="px-3 py-2 text-center"
                :class="cell && matchClass(cell.matched)"
              >
                {{ cell?.label }}
              </td>
              <td class="px-3 py-2 border-l border-default font-medium" :class="matchClass(row.matched)">
                {{ formatValue(row.than) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-default">
              <th :colspan="fields.length + 2" class="px-3 py-2 text-left font-medium text-muted">
                {{ $t('history.defaultDecision') }}
              </th>
              <td class="px-3 py-2 border-l border-default">{{ formatValue(decision.default_decision) }}</td>
            </tr>
            <tr class="border-t border-default bg-primary/5">
              <th :colspan="fields.length + 2" class="px-3 py-2 text-left font-semibold">
                {{ $t('history.finalDecision') }}
              </th>
              <td class="px-3 py-2 border-l border-default font-semibold">{{ formatValue(decision.final_decision) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import type { FieldType, RuleCondition } from '~/types/decision-table'
import { conditionLabel } from '~/utils/conditionLabel'

// Décision telle qu'enregistrée par l'API : instantané des champs et des règles
// de la variante, chaque condition avec son résultat (`matched`) et chaque règle
// avec ce qu'elle a décidé (`decision` : son `than` si toutes ses conditions
// ont matché, null sinon).
interface HistoryCondition extends RuleCondition {
  matched?: boolean
}

interface HistoryRule {
  title: string
  description?: string
  than: unknown
  decision: unknown
  conditions: HistoryCondition[]
}

interface HistoryDecision {
  table: { _id: string; title: string; variant?: { _id: string; title: string } }
  fields?: { key: string; title: string; type: FieldType }[]
  request: Record<string, unknown>
  rules?: HistoryRule[]
  default_decision: unknown
  final_decision: unknown
  created_at: string
}

// fullWidth : la page gère elle-même ses conteneurs pour que le tableau occupe toute la largeur de la fenêtre (cf. layouts/default.vue)
definePageMeta({ middleware: 'auth', fullWidth: true })

const { t } = useI18n()
const route = useRoute()
const gandalf = useGandalf()
const id = route.params.id as string

const breadcrumbs = computed(() => [
  { label: t('history.title'), to: '/history' },
  { label: id },
])

const decision = ref<HistoryDecision | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const response = await gandalf.history.getById(id)
    decision.value = response.data as HistoryDecision
  }
  finally { loading.value = false }
})

// Colonnes : les champs de la table au moment de la décision. Une décision sans
// cet instantané retombe sur les champs cités par les conditions.
const fields = computed(() => {
  const d = decision.value
  if (!d) return []
  if (d.fields?.length) return d.fields
  const keys = [...new Set((d.rules ?? []).flatMap(r => r.conditions.map(c => c.field_key)))]
  return keys.map(key => ({ key, title: key, type: undefined }))
})

// Une ligne par règle, une cellule par colonne (null si la règle n'a pas de
// condition sur ce champ). Conditions rapprochées des champs par field_key.
const rows = computed(() =>
  (decision.value?.rules ?? []).map(rule => ({
    title: rule.title,
    description: rule.description,
    than: rule.than,
    matched: rule.decision !== null && rule.decision !== undefined,
    cells: fields.value.map((field) => {
      const condition = rule.conditions.find(c => c.field_key === field.key)
      return condition
        ? { label: conditionLabel(condition, field.type, t), matched: condition.matched === true }
        : null
    }),
  })),
)

function matchClass(matched: boolean): string {
  return matched ? 'bg-success/20' : 'bg-error/20'
}

function formatValue(value: unknown): string {
  return value === null || value === undefined ? '—' : String(value)
}
</script>
