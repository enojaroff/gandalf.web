<!-- Page d'édition d'une table de décision. Pour une variante donnée -->
<template>
  <div>
    <UBreadcrumb :items="breadcrumbs" class="mb-4" />

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
    </div>

    <template v-else-if="table && variant">
      <!-- Actions bar -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-4">
          <p class="text-sm text-muted">Variant: {{ variant.title }}</p>
          <div class="flex gap-2">
            <UButton variant="ghost" size="sm" :to="`/tables/${tableId}/debug`">Test</UButton>
            <UButton variant="ghost" size="sm" :to="`/tables/${tableId}/analytics`">Analytics</UButton>
          </div>
        </div>
        <div class="flex gap-2">
          <DecisionTableExcelExportImport
            :table-id="tableId"
            :variant-id="variantId"
            @imported="onImported"
          />
          <UButton icon="i-lucide-plus" variant="outline" size="sm" @click="addRule">
            {{ $t('tables.addRule') }}
          </UButton>
          <UButton icon="i-lucide-plus" variant="outline" size="sm" @click="showAddFieldModal = true">
            {{ $t('tables.addField') }}
          </UButton>
          <UButton icon="i-lucide-check" :loading="saving" @click="save">
            {{ $t('common.save') }}
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
        <UButton icon="i-lucide-plus" variant="outline" size="sm" @click="addRule">
          {{ $t('tables.addRule') }}
        </UButton>
        <span></span>
      </UContainer>
      <!-- Default Decision row -->
      <UCard class="mt-2" variant="subtle">
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
          icon="i-lucide-trash-2"
          :loading="deleting"
          @click="confirmDelete"
        >
          {{ $t('tables.deleteTable') }}
        </UButton>
        <UButton icon="i-lucide-check" :loading="saving" @click="save">
          {{ $t('common.save') }}
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
          <UFormField label="Key" :hint="$t('fields.keyHint')" :error="editFieldError ?? undefined" class="w-full">
            <UInput v-model="editFieldForm.key" class="w-full font-mono" />
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
            <UButton :loading="editFieldBusy" @click="submitEditField">Save</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { DecisionTable, DecisionVariant, DecisionRule, DecisionField, FieldType, RuleCondition } from '~/types/decision-table'
import { objectId } from '~/utils/filters'
import { CONDITION_TYPES, isConditionValidForType } from '~/utils/transforms'
import { apiValidationMessages } from '~/utils/apiErrors'
import { fieldKeyError, normalizeFieldKey } from '~/utils/fieldKeys'
import type { TableUpdateMeta } from '~/composables/useGandalf'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const toast = useToast()
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
const addFieldForm = reactive({ key: '', title: '', type: 'string' as FieldType })
const addFieldError = ref<string | null>(null)
const fieldTypeOptions = [
  { label: 'String (text)', value: 'string' },
  { label: 'Numeric (number)', value: 'numeric' },
  { label: 'Boolean (true/false)', value: 'boolean' },
  { label: 'Date (YYYY-MM-DD)', value: 'date' },
]

// Edit Field form (`originalKey` identifies the field while its key is edited)
const editFieldForm = reactive({ originalKey: '', key: '', title: '', type: 'string' as FieldType })
const editFieldError = ref<string | null>(null)
const editFieldBusy = ref(false)

function openEditField(field: DecisionField) {
  editFieldForm.originalKey = field.key
  editFieldForm.key = field.key
  editFieldForm.title = field.title
  editFieldForm.type = field.type
  editFieldError.value = null
  showEditFieldModal.value = true
}

// Keys of the table's other active fields.
function otherFieldKeys(field?: DecisionField): string[] {
  return (table.value?.fields ?? []).filter(f => f !== field && !f.isDeleted).map(f => f.key)
}

// Titles of the project's flows that use this table (null if they cannot be listed).
async function flowsUsingTable(): Promise<string[] | null> {
  try {
    const response = await gandalf.flows.list(200, 1, { table_id: tableId })
    return response.data.map(flow => flow.title)
  }
  catch {
    return null
  }
}

async function submitEditField() {
  if (!table.value || editFieldBusy.value) return
  const field = table.value.fields.find(f => f.key === editFieldForm.originalKey)
  if (!field) return
  // The form may change while the flows are being listed: work on a snapshot.
  const form = { ...editFieldForm }
  editFieldError.value = null

  // Renaming is about the stored form: a key added as "Age" is stored "age".
  const newKey = normalizeFieldKey(form.key)
  const renamed = newKey !== normalizeFieldKey(field.key)
  if (renamed) {
    const error = fieldKeyError(newKey, otherFieldKeys(field))
    if (error) {
      editFieldError.value = t(error)
      return
    }
  }

  // A field is shared by every variant: the conditions the API would reject
  // under the new type (e.g. "> 10" on a date) fall back to the neutral '$any'
  // everywhere, otherwise the next save would fail.
  const conditions = table.value.variants.flatMap(v => v.rules).flatMap(r => r.conditions).filter(c => c.field_key === field.key)
  const hasPreset = !!(field.preset as { condition?: string } | null | undefined)?.condition
  const incompatible = form.type !== field.type
    ? conditions.filter(c => !isConditionValidForType(form.type, c, hasPreset))
    : []

  // Every confirmation first: nothing changes if one is declined.
  if (renamed) {
    editFieldBusy.value = true
    const flows = await flowsUsingTable()
    editFieldBusy.value = false
    // Modal closed, or reopened on another field, meanwhile
    if (!showEditFieldModal.value || editFieldForm.originalKey !== form.originalKey) return
    const flowList = flows === null ? '?' : (flows.length ? flows.join(', ') : t('tables.renameFieldNoFlow'))
    if (!confirm(t('tables.renameFieldConfirm', { from: field.key, to: newKey, flows: flowList }))) return
  }
  if (incompatible.length
    && !confirm(t('tables.typeChangeConfirm', { field: field.title || field.key, count: incompatible.length }))) return

  // The API recognizes a rename on save (same field _id, new key) and makes the
  // project's flows follow it; locally, the field and its condition in every
  // rule of every variant are renamed.
  if (renamed) {
    for (const condition of conditions) condition.field_key = newKey
    field.key = newKey
  }
  for (const condition of incompatible) {
    condition.condition = CONDITION_TYPES.ANY
    condition.value = NEUTRAL_VALUE
  }
  field.title = form.title
  field.type = form.type
  showEditFieldModal.value = false
}

// Report what the API did with field renames on save (response meta).
function reportFieldRenames(meta?: TableUpdateMeta) {
  if (!meta?.field_renames || !Object.keys(meta.field_renames).length) return
  const updated = meta.flows_updated ?? []
  toast.add({
    title: t('tables.renameFieldSaved'),
    description: updated.length ? t('tables.renameFieldFlowsUpdated', { flows: updated.join(', ') }) : undefined,
    color: 'success',
  })
  if (meta.flows_failed?.length) {
    toast.add({ title: t('tables.renameFieldFlowsFailed', { flows: meta.flows_failed.join(', ') }), color: 'error' })
  }
}

function deleteEditField() {
  if (!table.value) return
  const field = table.value.fields.find(f => f.key === editFieldForm.originalKey)
  if (!field) return
  // A field (column) is shared by every variant, so removing it must remove the
  // matching condition from EVERY rule of EVERY variant. Confirm first, since it
  // affects all variants at once.
  if (!confirm(t('tables.deleteFieldConfirm', { field: field.title || field.key }))) return
  field.isDeleted = true
  // Drop the corresponding condition everywhere so conditions stay aligned with
  // the (filtered) field list — the table renders conditions by column position.
  for (const v of table.value.variants) {
    for (const rule of v.rules) {
      rule.conditions = rule.conditions.filter(c => c.field_key !== field.key)
    }
  }
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

onMounted(async () => {
  try {
    const response = await gandalf.tables.getById(tableId)
    table.value = response.data
  }
  finally {
    loading.value = false
  }
})

/** Import Excel réussi : l'API renvoie la table à jour, on remplace l'état local. */
function onImported(imported: DecisionTable) {
  // L'import round-trip met à jour la table courante ; un import mode=create
  // renverrait une autre table — dans ce cas on ne remplace pas l'éditeur.
  if (imported._id === tableId) {
    table.value = imported
  }
}

const breadcrumbs = computed(() => [
  { label: 'Tables', to: '/tables' },
  { label: table.value?.title || tableId, to: `/tables/${tableId}/info` },
  { label: variant.value?.title || variantId, to: `/tables/${tableId}/${variantId}/edit` },
  { label: 'Edit' },
])


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
  if (!table.value) return
  // Same rules as a rename, on the key as the API stores it ("Age" -> "age").
  const key = normalizeFieldKey(addFieldForm.key)
  const error = fieldKeyError(key, otherFieldKeys())
  if (error) { addFieldError.value = t(error); return }

  const field: DecisionField = {
    _id: objectId(),
    key,
    title: addFieldForm.title || key,
    type: addFieldForm.type,
    source: 'request',
    preset: null,
  }

  // Adding a column adds a NEUTRAL '$any' condition (always true) to every rule
  // of every variant, so an existing rule's outcome is unchanged. Same default
  // as the save/backend normalisation — one consistent behaviour everywhere.
  table.value.fields.push(field)
  for (const v of table.value.variants) {
    for (const rule of v.rules) {
      rule.conditions.push({ field_key: field.key, condition: CONDITION_TYPES.ANY, value: NEUTRAL_VALUE } as RuleCondition)
    }
  }

  addFieldForm.key = ''
  addFieldForm.title = ''
  addFieldForm.type = 'string'
  showAddFieldModal.value = false
}

// Align a rule's conditions to the active field set: exactly one condition per
// field, in field order. Keep the existing condition (matched by field_key),
// synthesise a NEUTRAL '$any' condition for a missing field, drop orphans.
// '$any' (always true) matches the backend normalisation exactly, so a field
// added to a rule that lacked it never changes that rule's outcome — regardless
// of whether the frontend or the backend does the aligning.
// Value of a neutral '$any' condition: the API requires a value even for
// valueless operators (`required|conditionType`), and `true` is what the
// condition editor and the Excel codec store for them. A null value made the
// whole save fail with a 422.
const NEUTRAL_VALUE = true as const

function alignConditions(rule: DecisionRule, activeFieldKeys: string[]): RuleCondition[] {
  const byKey = new Map(rule.conditions.map(c => [c.field_key, c]))
  return activeFieldKeys.map(key =>
    byKey.get(key) ?? { field_key: key, condition: CONDITION_TYPES.ANY, value: NEUTRAL_VALUE } as RuleCondition,
  )
}

async function save() {
  if (!table.value) return
  saving.value = true
  try {
    const activeFieldKeys = table.value.fields.filter(f => !f.isDeleted).map(f => f.key)
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
          .map(({ isDeleted: _d, ...r }) => ({ ...r, conditions: alignConditions(r, activeFieldKeys) })),
      })),
    }
    const response = await gandalf.tables.update(tableId, payload as never)
    table.value = response.data
    reportFieldRenames(response.meta)
  }
  catch (err: unknown) {
    // Show why the API refused the table (422 details) instead of failing silently.
    toast.add({
      title: t('errors.failedToSave'),
      description: apiValidationMessages(err).join(' ') || undefined,
      color: 'error',
    })
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
