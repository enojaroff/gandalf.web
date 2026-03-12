<template>
  <div class="max-w-2xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <UButton to="/tables" variant="ghost" icon="i-heroicons-arrow-left" size="sm" />
      <h1 class="text-2xl font-bold">New Decision Table</h1>
    </div>

    <UCard>
      <UForm :state="form" @submit="onSubmit">
        <UFormField label="Table Name" name="title" class="mb-4" required>
          <UInput
            v-model="form.title"
            placeholder="e.g. Credit Scoring"
            :disabled="loading"
          />
        </UFormField>

        <UFormField label="Description" name="description" class="mb-4">
          <UTextarea
            v-model="form.description"
            placeholder="What does this table decide?"
            :disabled="loading"
            :rows="3"
          />
        </UFormField>

        <UFormField label="Matching Type" name="matching_type" class="mb-6">
          <USelect
            v-model="form.matching_type"
            :items="matchingTypeOptions"
            value-key="value"
            label-key="label"
            :disabled="loading"
          />
          <p class="text-xs text-muted mt-1">{{ matchingTypeDescription }}</p>
        </UFormField>

        <UAlert v-if="error" color="error" :description="error" class="mb-4" />

        <div class="flex gap-3 justify-end">
          <UButton to="/tables" variant="outline" :disabled="loading">Cancel</UButton>
          <UButton type="submit" :loading="loading">Create Table</UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { MatchingType, DecisionType } from '~/types/decision-table'

definePageMeta({ middleware: 'auth' })

const gandalf = useGandalf()

const form = reactive({
  title: '',
  description: '',
  matching_type: 'first' as MatchingType,
})

const loading = ref(false)
const error = ref<string | null>(null)

const matchingTypeOptions = [
  { value: 'first', label: 'First match' },
  { value: 'scoring_sum', label: 'Scoring sum' },
  { value: 'scoring_max', label: 'Scoring max' },
  { value: 'scoring_min', label: 'Scoring min' },
  { value: 'scoring_count', label: 'Scoring count' },
]

const matchingTypeDescription = computed(() => {
  const descriptions: Record<MatchingType, string> = {
    first: 'Returns the result of the first matching rule.',
    scoring_sum: 'Sums the scores of all matching rules.',
    scoring_max: 'Returns the maximum score among matching rules.',
    scoring_min: 'Returns the minimum score among matching rules.',
    scoring_count: 'Counts the number of matching rules.',
  }
  return descriptions[form.matching_type] || ''
})

async function onSubmit() {
  if (!form.title.trim()) {
    error.value = 'Table name is required.'
    return
  }

  loading.value = true
  error.value = null

  // matching_type peut être un objet si USelect retourne l'item entier
  const matchingType: MatchingType = (typeof form.matching_type === 'object'
    ? (form.matching_type as { value: string }).value
    : form.matching_type) as MatchingType

  const decisionType: DecisionType = matchingType === 'first' ? 'alpha_num' : 'numeric'
  const defaultDecision = matchingType === 'first' ? '' : 0

  const initialField = { key: 'field_1', type: 'string', title: 'Field 1', source: 'request', preset: null }
  const initialCondition = { field_key: 'field_1', condition: '$eq', value: '1' }
  const initialRule = { priority: 0, than: defaultDecision, title: null, description: null, conditions: [initialCondition] }

  const body: Record<string, unknown> = {
    title: form.title,
    matching_type: matchingType,
    decision_type: decisionType,
    fields: [initialField],
    variants: [{
      title: form.title,
      probability: 100,
      default_decision: defaultDecision,
      rules: [initialRule],
    }],
  }
  if (form.description) body.description = form.description

  try {
    const response = await gandalf.tables.create(body as never)
    await navigateTo(`/tables/${response.data._id}/info`)
  }
  catch (err: unknown) {
    const fetchError = err as { status?: number; data?: unknown; message?: string }
    const data = fetchError?.data as { message?: string; error?: string } | undefined
    error.value = data?.message || data?.error || 'Failed to create table.'
  }
  finally {
    loading.value = false
  }
}
</script>
