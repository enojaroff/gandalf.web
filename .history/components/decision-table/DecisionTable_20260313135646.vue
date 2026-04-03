<template>
  <div class="decision-table-wrapper overflow-x-auto">
    <table class="decision-table">
      <!-- En-tête des colonnes -->
      <thead>
        <tr>
          <!-- Numéro de règle -->
          <th class="dt-cell dt-cell--num">#</th>

          <!-- Colonne titre / description -->
          <th class="dt-cell dt-cell--title">
            <span class="text-xs font-semibold">Title <br>Description</span>
          </th>

          <!-- Colonnes de champs (conditions) -->
          <th
            v-for="field in activeFields"
            :key="field._id"
            class="dt-cell dt-cell--field dt-cell--field-header"
            title="Click to edit field"
            @click="emit('edit-field', field)"
          >
            <div class="flex items-center gap-1">
              <span class="truncate max-w-24 text-xs font-semibold" :title="field.title">
                {{ field.title }}
              </span>
              <UBadge variant="outline" size="xs">{{ field.type }}</UBadge>
            </div>
            <div class="text-xs text-muted font-normal">{{ field.key }}</div>
          </th>

          <!-- Colonne séparation -->
          <th class="dt-cell dt-cell--sep">
            <span class="text-xs font-semibold"></span>
          </th>

          <!-- Colonne décision -->
          <th class="dt-cell dt-cell--decision">
            <div class="flex items-center gap-1">
              <span class="text-xs font-semibold">Decision</span>
              <UBadge variant="outline" size="xs">{{ table.decision_type }}</UBadge>
            </div>
          </th>

          <!-- Actions règle -->
          <th class="dt-cell dt-cell--actions" />
        </tr>
      </thead>

      <!-- Règles -->
      <tbody>
        <tr
          v-for="(rule, ruleIdx) in activeRules"
          :key="rule._id"
          class="dt-row"
          :class="{ 'dt-row--deleted': rule.isDeleted }"
        >
          <!-- Numéro -->
          <td class="dt-cell dt-cell--num">
            <span class="text-muted text-xs">{{ ruleIdx + 1 }}</span>
          </td>

          <!-- Titre / Description -->
          <td class="dt-cell dt-cell--title">
            <UInput
              v-model="rule.title"
              placeholder="Title"
              size="xs"
              variant="ghost"
              class="mb-1"
              @change="emitUpdate"
            />
            <UInput
              v-model="rule.description"
              placeholder="Description"
              size="xs"
              variant="ghost"
              @change="emitUpdate"
            />
          </td>

          <!-- Conditions -->
          <td
            v-for="(condition, condIdx) in rule.conditions"
            :key="condIdx"
            class="dt-cell dt-cell--condition"
          >
            <!--
              :key force le remontage du UPopover (= fermeture) quand on clique Save/Cancel.
              @pointerdown initialise la copie avant que le popover rende son contenu.
              @update:open gère la fermeture par clic-extérieur (UPopover natif).
            -->
            <UPopover
              modal
              :dismissible="true"
              :content="{align: 'start', side: 'left', sideOffset: 0}"
              @update:open="(val: boolean) => !val && cancelEdit()"
            >
              <div
                class="condition-display"
                @pointerdown.stop="openEdit(rule._id, condIdx)"
              >
                <template v-if="activeFields[condIdx]">
                  <span class="condition-op">{{ conditionOpLabel(condition.condition) }}</span>
                  <span v-if="conditionHasValue(condition)" class="condition-val">
                    {{ conditionValueLabel(condition) }}
                  </span>
                </template>
              </div>

              <template #content>
                <div class="condition-popover-content">
                  <DecisionTableConditionInput
                    v-if="editingConditionCopy && activeFields[condIdx]"
                    :field="activeFields[condIdx]!"
                    :condition="editingConditionCopy"
                  />
                  <div class="condition-popover-actions">
                    <UButton size="xs" variant="outline" @click="onCancelClick(rule._id, condIdx)">Cancel</UButton>
                    <UButton size="xs" @click="onSaveClick(rule._id, condIdx)">Save</UButton>
                  </div>
                </div>
              </template>
            </UPopover>
          </td>

          <!-- Séparation -->
          <td class="dt-cell dt-cell--sep">
            <span class="text-muted text-xs"></span>
          </td>

          <!-- Décision -->
          <td class="dt-cell dt-cell--decision">
            <DecisionTableDecisionInput
              v-model="rule.than"
              :decision-type="table.decision_type"
            />
          </td>

          <!-- Actions -->
          <td class="dt-cell dt-cell--actions">
            <div class="flex gap-1">
              <UButton
                variant="ghost"
                icon="i-heroicons-document-duplicate"
                size="xs"
                :title="'Clone rule'"
                @click="cloneRule(rule, ruleIdx)"
              />
              <UButton
                variant="ghost"
                :icon="rule.isDeleted ? 'i-heroicons-arrow-uturn-left' : 'i-heroicons-trash'"
                :color="rule.isDeleted ? 'warning' : 'error'"
                size="xs"
                @click="toggleDelete(rule)"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

</template>

<script setup lang="ts">
import type { DecisionTable, DecisionVariant, DecisionRule, DecisionField, RuleCondition } from '~/types/decision-table'
import { objectId } from '~/utils/filters'
import { CONDITION_OPTIONS } from '~/utils/transforms'

const props = defineProps<{
  table: DecisionTable
  variant: DecisionVariant
}>()

const emit = defineEmits<{
  'update:table': [table: DecisionTable]
  'edit-field': [field: DecisionField]
}>()

// ── Cellule en cours d'édition ──────────────────────────────────────────────
const editingCell = ref<{ ruleId: string, condIdx: number } | null>(null)
const editingConditionCopy = ref<RuleCondition | null>(null)

function isEditing(ruleId: string, condIdx: number) {
  return editingCell.value?.ruleId === ruleId && editingCell.value?.condIdx === condIdx
}

function openEdit(ruleId: string, condIdx: number) {
  const rule = props.variant.rules.find(r => r._id === ruleId)
  if (!rule) return
  editingConditionCopy.value = JSON.parse(JSON.stringify(rule.conditions[condIdx]))
  editingCell.value = { ruleId, condIdx }
}

function cancelEdit() {
  editingCell.value = null
  editingConditionCopy.value = null
}

function saveEdit() {
  if (!editingCell.value || !editingConditionCopy.value) return
  const { ruleId, condIdx } = editingCell.value
  const rule = props.variant.rules.find(r => r._id === ruleId)
  if (rule) {
    rule.conditions.splice(condIdx, 1, editingConditionCopy.value)
  }
  editingCell.value = null
  editingConditionCopy.value = null
  emitUpdate()
}

// ── Labels de condition (mode affichage) ────────────────────────────────────
const OP_LABELS: Record<string, string> = {
  $is_set: 'is set',
  $is_null: 'is null',
  $eq: '=',
  $ne: '≠',
  $gt: '>',
  $gte: '≥',
  $lt: '<',
  $lte: '≤',
  $between: 'between',
  $not_between: 'not between',
  $contains: 'contains',
  $not_contains: "doesn't contain",
  $starts_with: 'starts with',
  $ends_with: 'ends with',
  $in: 'in',
  $nin: 'not in',
}

function conditionOpLabel(op: string | null | undefined) {
  return OP_LABELS[op ?? ''] ?? op ?? '?'
}

function conditionHasValue(condition: { condition?: string | null, value?: unknown }) {
  return !CONDITION_OPTIONS.hasNotValue.includes(condition.condition ?? '')
}

function conditionValueLabel(condition: { value?: unknown }) {
  const v = condition.value
  if (Array.isArray(v)) return `${v[0]} – ${v[1]}`
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

// ── Champs actifs (non supprimés) ───────────────────────────────────────────
const activeFields = computed(() =>
  props.table.fields.filter(f => !f.isDeleted),
)

// Règles actives (non supprimées filtrées pour l'affichage)
const activeRules = computed(() =>
  props.variant.rules.filter(r => !r.isDeleted),
)

function emitUpdate() {
  emit('update:table', { ...props.table })
}

function cloneRule(rule: DecisionRule, idx: number) {
  const cloned: DecisionRule = {
    ...JSON.parse(JSON.stringify(rule)),
    _id: objectId(),
  }
  props.variant.rules.splice(idx + 1, 0, cloned)
  emitUpdate()
}

function toggleDelete(rule: DecisionRule) {
  rule.isDeleted = !rule.isDeleted
  emitUpdate()
}
</script>

<style scoped>
.decision-table-wrapper {
  border: 1px solid var(--ui-border);
  border-radius: var(--radius-md);
}

.decision-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.dt-cell {
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--ui-border);
  vertical-align: middle;
}

/* ── Colonnes fixes gauche ─────────────────────────────── */
.dt-cell--num {
  position: sticky;
  left: 0;
  z-index: 2;
  width: 2.5rem;
  text-align: center;
  background: var(--ui-bg-muted);
}

.dt-cell--title {
  position: sticky;
  left: 2.5rem;        /* après la colonne # (40px) */
  z-index: 2;
  min-width: 160px;
  background: var(--ui-bg);
  /* ombre à droite pour marquer la limite */
  box-shadow: 2px 0 4px -2px var(--ui-border);
}

/* ── Colonnes fixes droite ─────────────────────────────── */
.dt-cell--actions {
  position: sticky;
  right: 0;
  z-index: 2;
  width: 4rem;
  background: var(--ui-bg-muted);
}

.dt-cell--decision {
  position: sticky;
  right: 4rem;         /* après la colonne actions (64px) */
  z-index: 2;
  min-width: 120px;
  background: color-mix(in srgb, var(--ui-primary) 5%, var(--ui-bg));
  /* ombre à gauche pour marquer la limite */
  box-shadow: -2px 0 4px -2px var(--ui-border);
}

/* ── Colonnes scrollables ──────────────────────────────── */
.dt-cell--sep {
  width: 8px;
  text-align: center;
  background: var(--ui-bg-elevated) !important;
  padding-left: 0;
  padding-right: 0;
}

.dt-cell--field {
  min-width: 140px;
  background: var(--ui-bg-muted);
}

.dt-cell--field-header {
  cursor: pointer;
}

.dt-cell--field-header:hover {
  background: var(--ui-bg-elevated);
}

/* ── En-têtes ──────────────────────────────────────────── */
thead .dt-cell {
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
}

/* Les cellules en-tête qui sont aussi sticky horizontalement */
thead .dt-cell--num,
thead .dt-cell--title,
thead .dt-cell--decision,
thead .dt-cell--actions {
  z-index: 3;
}

/* ── Cellules condition ────────────────────────────────── */
.dt-cell--condition {
  cursor: pointer;
  min-width: 140px;
  padding: 0;
}

.condition-display {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 1.75rem;
  padding: 0.375rem 0.5rem;
  border-radius: var(--radius-sm);
  width: 100%;
}

.dt-row:hover .dt-cell--condition .condition-display {
  background: color-mix(in srgb, var(--ui-primary) 6%, transparent);
}

.condition-op {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ui-primary);
  white-space: nowrap;
}

.condition-val {
  font-size: 0.75rem;
  color: var(--ui-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

/* ── Popover d'édition ─────────────────────────────────── */
.condition-popover-content {
  padding: 0.75rem;
  min-width: 280px;
}

.condition-popover-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--ui-border);
}

/* ── Hover ─────────────────────────────────────────────── */
.dt-row:hover .dt-cell {
  background: var(--ui-bg-elevated);
}

/* Maintien du fond des colonnes fixes au hover */
.dt-row:hover .dt-cell--num,
.dt-row:hover .dt-cell--title {
  background: var(--ui-bg-elevated);
}

.dt-row:hover .dt-cell--actions {
  background: var(--ui-bg-elevated);
}

.dt-row:hover .dt-cell--decision {
  background: color-mix(in srgb, var(--ui-primary) 8%, var(--ui-bg-elevated));
}

/* ── Overlay click-outside ─────────────────────────────── */
:global(.condition-editor-overlay) {
  position: fixed;
  inset: 0;
  z-index: 49; /* sous le popover Nuxt UI (z-50) */
}

/* ── Lignes supprimées ─────────────────────────────────── */
.dt-row--deleted .dt-cell {
  opacity: 0.4;
  text-decoration: line-through;
}
</style>
