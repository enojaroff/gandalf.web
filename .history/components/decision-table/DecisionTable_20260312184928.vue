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
            class="dt-cell dt-cell--field"
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
            <span class="text-xs font-semibold">+</span>
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
            class="dt-cell"
          >
            <DecisionTableConditionInput
              v-if="activeFields[condIdx]"
              :field="activeFields[condIdx]!"
              :condition="condition"
              @change="emitUpdate"
            />
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
import type { DecisionTable, DecisionVariant, DecisionRule } from '~/types/decision-table'
import { objectId } from '~/utils/filters'

const props = defineProps<{
  table: DecisionTable
  variant: DecisionVariant
}>()

const emit = defineEmits<{
  'update:table': [table: DecisionTable]
}>()

// Champs actifs (non supprimés)
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

.dt-cell--num {
  width: 2.5rem;
  text-align: center;
  background: var(--ui-bg-muted);
}

.dt-cell--sep {
  width: 4px;
  text-align: center;
  background: var(--ui-bg-elevated) !important;
  padding-left:0;
  padding-right:0;
}

.dt-cell--field {
  min-width: 140px;
  background: var(--ui-bg-muted);
}

.dt-cell--title {
  min-width: 160px;
}

.dt-cell--decision {
  min-width: 120px;
  background: color-mix(in srgb, var(--ui-primary) 5%, transparent);
}

.dt-cell--actions {
  width: 4rem;
  background: var(--ui-bg-muted);
}

thead .dt-cell {
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
}

.dt-row:hover .dt-cell {
  background: var(--ui-bg-elevated);
}

.dt-row--deleted .dt-cell {
  opacity: 0.4;
  text-decoration: line-through;
}
</style>
