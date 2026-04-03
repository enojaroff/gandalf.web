<template>
  <div>
    <UBreadcrumb :items="breadcrumbs" class="mb-4" />

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-primary" />
    </div>

    <template v-else-if="table && variant">
      <!-- Header: title, description, type selectors -->
      <UCard class="mb-4">
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Table Name">
              <UInput v-model="table.title" placeholder="Table name" />
            </UFormField>
            <UFormField label="Description">
              <UInput v-model="table.description" placeholder="Description" />
            </UFormField>
          </div>

          <div class="flex flex-wrap gap-6 items-start">
            <!-- Table Type: Decision / Scoring -->
            <div>
              <p class="text-xs font-semibold text-muted uppercase mb-2">Table Type</p>
              <div class="flex gap-1">
                <UButton
                  size="sm"
                  :variant="isDecisionType ? 'solid' : 'outline'"
                  @click="setMatchingType('first')"
                >
                  Decision
                </UButton>
                <UButton
                  size="sm"
                  :variant="!isDecisionType ? 'solid' : 'outline'"
                  @click="setMatchingType(!isDecisionType ? table.matching_type : 'scoring_sum')"
                >
                  Scoring
                </UButton>
              </div>
            </div>

            <!-- Decision Type (only for "first") -->
            <div v-if="isDecisionType">
              <p class="text-xs font-semibold text-muted uppercase mb-2">Decision Type</p>
              <div class="flex gap-1">
                <UButton
                  v-for="dt in decisionTypes"
                  :key="dt.value"
                  size="sm"
                  :variant="table.decision_type === dt.value ? 'solid' : 'outline'"
                  @click="table.decision_type = dt.value"
                >
                  {{ dt.label }}
                </UButton>
              </div>
            </div>

            <!-- Scoring Type (only for scoring) -->
            <div v-if="!isDecisionType">
              <p class="text-xs font-semibold text-muted uppercase mb-2">Scoring Type</p>
              <div class="flex gap-1">
                <UButton
                  v-for="st in scoringTypes"
                  :key="st.value"
                  size="sm"
                  :variant="table.matching_type === st.value ? 'solid' : 'outline'"
                  @click="setMatchingType(st.value)"
                >
                  {{ st.label }}
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Actions bar -->
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm text-muted">Variant: {{ variant.title }}</p>
        <div class="flex gap-2">
          <UButton icon="i-heroicons-plus" variant="outline" size="sm" @click="addRule">
            Add Rule
          </UButton>
          <UButton icon="i-heroicons-plus" variant="outline" size="sm" @click="showAddFieldModal = true">
            Add Field
          </UButton>
          <UButton icon="i-heroicons-check" :loading="saving" @click="save">
            Save
          </UButton>
        </div>
      </div>

      <!-- Decision Table -->
      <DecisionTable
        :table="table"
        :variant="variant"
        @update:table="table = $event"
        @edit-field="openEditField"
      />

      <UContainer class="flex items-center justify-between h-16">
        <span></span>
        <UButton icon="i-heroicons-plus" variant="outline" size="sm" @click="addRule">
          Add Rule
        </UButton>
        <span></span>
      </UContainer>
      <!-- Default Decision row -->
      <UCard class="mt-2">
        <div class="flex items-center gap-3">
          <span class="text-xs font-semibold text-muted uppercase shrink-0 w-28">Default Decision</span>
          <UInput v-model="variantDefaultTitle" placeholder="Title" class="flex-1" />
          <UInput v-model="variantDefaultDescription" placeholder="Description" class="flex-1" />
          <UInput
            v-model="variantDefaultDecision"
            :placeholder="isDecisionType ? 'Value' : '0'"
            class="w-32"
          />
        </div>
      </UCard>

      <!-- Footer: delete + save -->
      <div class="mt-6 flex justify-between">
        <UButton
          color="error"
          variant="outline"
          icon="i-heroicons-trash"
          :loading="deleting"
          @click="confirmDelete"
        >
          Delete Table
        </UButton>
        <UButton icon="i-heroicons-check" :loading="saving" @click="save">
          Save
        </UButton>
      </div>
    </template>

    <!-- Modal ajout de champ -->
    <UModal v-model:open="showAddFieldModal">
      <template #header>
        <h3 class="text-base font-semibold">Add Field</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="Key" name="key" required class="w-full">
            <UInput v-model="addFieldForm.key" placeholder="e.g. age, income_type" class="w-full" />
            <p class="text-xs text-muted mt-1">Lowercase, no spaces.</p>
          </UFormField>
          <UFormField label="Title" name="title" class="w-full">
            <UInput v-model="addFieldForm.title" placeholder="Human-readable label" class="w-full" />
          </UFormField>
          <UFormField label="Type" name="type" class="w-full">
            <USelect
              v-model="addFieldForm.type"
              :items="fieldTypeOptions"
              class="w-full"
            />
          </UFormField>
          <UAlert v-if="addFieldError" color="error" :description="addFieldError" />
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <UButton variant="outline" @click="showAddFieldModal = false">Cancel</UButton>
          <UButton @click="submitAddField">Add Field</UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal édition de champ -->
    <UModal v-model:open="showEditFieldModal">
      <template #header>
        <h3 class="text-base font-semibold">Edit Field</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="Key" class="w-full">
            <UInput :model-value="editFieldForm.key" disabled class="w-full" />
          </UFormField>
          <UFormField label="Title" class="w-full">
            <UInput v-model="editFieldForm.title" placeholder="Human-readable label" class="w-full" />
          </UFormField>
          <UFormField label="Type" class="w-full">
            <USelect v-model="editFieldForm.type" :items="fieldTypeOptions" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-between">
          <UButton color="error" variant="outline" @click="deleteEditField">Delete Field</UButton>
          <div class="flex gap-2">
            <UButton variant="outline" @click="showEditFieldModal = false">Cancel</UButton>
            <UButton @click="submitEditField">Save</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { DecisionTable, DecisionVariant, DecisionRule, DecisionField, RuleCondition, MatchingType, DecisionType } from '~/types/decision-table'
import { objectId } from '~/utils/filters'
import { CONDITION_TYPES } from '~/utils/transforms'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const gandalf = useGandalf()
const tableId = route.params.id as string
const variantId = route.params.variantId as string

const table = ref<DecisionTable | null>(null)
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const showAddFieldModal = ref(false)
const showEditFieldModal = ref(false)

// Add Field form
const addFieldForm = reactive({ key: '', title: '', type: 'string' as 'string' | 'numeric' | 'boolean' })
const addFieldError = ref<string | null>(null)
const fieldTypeOptions = [
  { label: 'String (text)', value: 'string' },
  { label: 'Numeric (number)', value: 'numeric' },
  { label: 'Boolean (true/false)', value: 'boolean' },
]

// Edit Field form
const editFieldForm = reactive({ key: '', title: '', type: 'string' as 'string' | 'numeric' | 'boolean' })

function openEditField(field: DecisionField) {
  editFieldForm.key = field.key
  editFieldForm.title = field.title
  editFieldForm.type = field.type as 'string' | 'numeric' | 'boolean'
  showEditFieldModal.value = true
}

function submitEditField() {
  if (!table.value) return
  const field = table.value.fields.find(f => f.key === editFieldForm.key)
  if (!field) return
  field.title = editFieldForm.title
  field.type = editFieldForm.type
  showEditFieldModal.value = false
}

function deleteEditField() {
  if (!table.value) return
  const field = table.value.fields.find(f => f.key === editFieldForm.key)
  if (!field) return
  field.isDeleted = true
  showEditFieldModal.value = false
}

const variant = computed<DecisionVariant | undefined>(() =>
  table.value?.variants.find(v => v._id === variantId),
)

// Two-way bindings for variant default decision fields
const variantDefaultTitle = computed({
  get: () => (variant.value?.default_title as string) ?? '',
  set: (val: string) => {
    const v = table.value?.variants.find(v => v._id === variantId)
    if (v) v.default_title = val
  },
})
const variantDefaultDescription = computed({
  get: () => (variant.value?.default_description as string) ?? '',
  set: (val: string) => {
    const v = table.value?.variants.find(v => v._id === variantId)
    if (v) v.default_description = val
  },
})
const variantDefaultDecision = computed({
  get: () => String(variant.value?.default_decision ?? ''),
  set: (val: string) => {
    const v = table.value?.variants.find(v => v._id === variantId)
    if (v) v.default_decision = table.value?.matching_type === 'first' ? val : Number(val)
  },
})

const isDecisionType = computed(() => table.value?.matching_type === 'first')

const decisionTypes: { value: DecisionType; label: string }[] = [
  { value: 'alpha_num', label: 'Alphanumeric' },
  { value: 'string', label: 'String' },
  { value: 'numeric', label: 'Number' },
  { value: 'json', label: 'JSON' },
]

const scoringTypes: { value: MatchingType; label: string }[] = [
  { value: 'scoring_sum', label: 'Sum' },
  { value: 'scoring_min', label: 'Min' },
  { value: 'scoring_max', label: 'Max' },
  { value: 'scoring_count', label: 'Count' },
]

onMounted(async () => {
  try {
    const response = await gandalf.tables.getById(tableId)
    table.value = response.data
  }
  finally {
    loading.value = false
  }
})

const breadcrumbs = computed(() => [
  { label: 'Tables', to: '/tables' },
  { label: table.value?.title || tableId, to: `/tables/${tableId}/info` },
  { label: variant.value?.title || 'Edit' },
])

function setMatchingType(type: MatchingType) {
  if (!table.value) return
  table.value.matching_type = type
  if (type !== 'first') {
    table.value.decision_type = 'numeric'
  }
}

function addRule() {
  if (!table.value || !variant.value) return

  const newRule: DecisionRule = {
    _id: objectId(),
    priority: variant.value.rules.length,
    than: variant.value.default_decision,
    title: null,
    description: null,
    conditions: table.value.fields.map(field => ({
      field_key: field.key,
      condition: CONDITION_TYPES.IS_SET,
      value: true,
    } as RuleCondition)),
  }

  const variantIdx = table.value.variants.findIndex(v => v._id === variantId)
  if (variantIdx >= 0) {
    table.value.variants[variantIdx]!.rules.push(newRule)
  }
}

function submitAddField() {
  addFieldError.value = null
  if (!addFieldForm.key.trim()) { addFieldError.value = 'Field key is required.'; return }
  if (!/^[a-zA-Z0-9_-]+$/.test(addFieldForm.key)) { addFieldError.value = 'Key must only contain letters, numbers, underscores, or hyphens.'; return }
  if (table.value?.fields.some(f => f.key === addFieldForm.key)) { addFieldError.value = 'A field with this key already exists.'; return }
  if (!table.value) return

  const field: DecisionField = {
    _id: objectId(),
    key: addFieldForm.key,
    title: addFieldForm.title || addFieldForm.key,
    type: addFieldForm.type,
    source: 'request',
    preset: null,
  }

  table.value.fields.push(field)
  for (const v of table.value.variants) {
    for (const rule of v.rules) {
      rule.conditions.push({ field_key: field.key, condition: CONDITION_TYPES.IS_SET, value: true } as RuleCondition)
    }
  }

  addFieldForm.key = ''
  addFieldForm.title = ''
  addFieldForm.type = 'string'
  showAddFieldModal.value = false
}

async function save() {
  if (!table.value) return
  saving.value = true
  try {
    // Strip frontend-only `isDeleted` flag before sending to API
    const payload = {
      ...table.value,
      fields: table.value.fields
        .filter(f => !f.isDeleted)
        .map(({ isDeleted: _d, ...f }) => f),
      variants: table.value.variants.map(v => ({
        ...v,
        rules: v.rules
          .filter(r => !r.isDeleted)
          .map(({ isDeleted: _d, ...r }) => r),
      })),
    }
    const response = await gandalf.tables.update(tableId, payload as never)
    table.value = response.data
  }
  catch {
    // TODO: toast error
  }
  finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!table.value || !confirm(`Delete table "${table.value.title}"?`)) return
  deleting.value = true
  try {
    await gandalf.tables.delete(tableId)
    await navigateTo('/tables')
  }
  catch {
    // TODO: toast error
  }
  finally {
    deleting.value = false
  }
}
</script>
