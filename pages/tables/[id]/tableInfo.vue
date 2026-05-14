<template>
  <div>
    <!-- Breadcrumb -->
    <UBreadcrumb :items="breadcrumbs" class="mb-4" />

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-3xl text-primary" />
    </div>

    <template v-else-if="table">
      <!-- En-tête -->
      <div class="flex items-start justify-between mb-6">
        <div class="space-y-1 flex-1 mr-4">
          <!-- Titre inline editable -->
          <div class="group flex items-center gap-2">
            <template v-if="!editingTitle">
              <h1 class="text-2xl font-bold">{{ table.title }}</h1>
              <UButton
                icon="i-lucide-pencil"
                variant="ghost"
                size="xs"
                class="opacity-0 group-hover:opacity-100 transition-opacity"
                @click="editingTitle = true"
              />
            </template>
            <template v-else>
              <UInput v-model="table.title" class="text-2xl font-bold" autofocus />
              <UButton icon="i-lucide-check" size="xs" :loading="saving" @click="saveTableInfo" />
              <UButton icon="i-lucide-x" size="xs" variant="ghost" @click="cancelEdit('title')" />
            </template>
          </div>

          <!-- Description inline editable -->
          <div class="group flex items-center gap-2">
            <template v-if="!editingDescription">
              <p class="text-muted">{{ table.description || '—' }}</p>
              <UButton
                icon="i-lucide-pencil"
                variant="ghost"
                size="xs"
                class="opacity-0 group-hover:opacity-100 transition-opacity"
                @click="editingDescription = true"
              />
            </template>
            <template v-else>
              <UInput v-model="table.description" :placeholder="$t('common.description')" autofocus />
              <UButton icon="i-lucide-check" size="xs" :loading="saving" @click="saveTableInfo" />
              <UButton icon="i-lucide-x" size="xs" variant="ghost" @click="cancelEdit('description')" />
            </template>
          </div>
        </div>

        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          @click="confirmDelete"
        />
      </div>

      <TableNav :table-id="tableId" :variants="table.variants" />

      <!-- Infos générales -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">{{ $t('tables.configuration') }}</h3>
              <template v-if="!editingTypes">
                <UButton
                  icon="i-lucide-pencil"
                  variant="ghost"
                  size="xs"
                  @click="editingTypes = true"
                />
              </template>
              <template v-else>
                <div class="flex gap-1">
                  <UButton icon="i-lucide-check" size="xs" :loading="saving" @click="saveTableInfo" />
                  <UButton icon="i-lucide-x" size="xs" variant="ghost" @click="cancelEdit('types')" />
                </div>
              </template>
            </div>
          </template>

          <!-- Mode lecture -->
          <template v-if="!editingTypes">
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-muted">{{ $t('tables.matchingType') }}</dt>
                <dd><UBadge variant="soft">{{ table.matching_type }}</UBadge></dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-muted">{{ $t('tables.decisionType') }}</dt>
                <dd><UBadge variant="soft">{{ table.decision_type }}</UBadge></dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-muted">{{ $t('tables.fields') }}</dt>
                <dd>{{ table.fields.length }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-muted">{{ $t('tables.variants') }}</dt>
                <dd>{{ table.variants.length }}</dd>
              </div>
            </dl>
          </template>

          <!-- Mode édition -->
          <template v-else>
            <div class="space-y-4 text-sm">
              <div>
                <p class="text-xs font-semibold text-muted uppercase mb-2">{{ $t('tables.tableType') }}</p>
                <div class="flex gap-1">
                  <UButton size="sm" :variant="isDecisionType ? 'solid' : 'outline'" @click="setMatchingType('first')">
                    Decision
                  </UButton>
                  <UButton size="sm" :variant="!isDecisionType ? 'solid' : 'outline'" @click="setMatchingType(!isDecisionType ? table.matching_type : 'scoring_sum')">
                    Scoring
                  </UButton>
                </div>
              </div>

              <div v-if="isDecisionType">
                <p class="text-xs font-semibold text-muted uppercase mb-2">{{ $t('tables.decisionType') }}</p>
                <div class="flex flex-wrap gap-1">
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

              <div v-if="!isDecisionType">
                <p class="text-xs font-semibold text-muted uppercase mb-2">{{ $t('tables.scoringType') }}</p>
                <div class="flex flex-wrap gap-1">
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

              <dl class="space-y-2">
                <div class="flex justify-between">
                  <dt class="text-muted">{{ $t('tables.fields') }}</dt>
                  <dd>{{ table.fields.length }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-muted">{{ $t('tables.variants') }}</dt>
                  <dd>{{ table.variants.length }}</dd>
                </div>
              </dl>
            </div>
          </template>
        </UCard>

        <UCard class="col-span-2">
          <template #header>
            <h3 class="font-semibold">{{ $t('tables.variants') }}</h3>
          </template>
          <ul class="space-y-2">
            <li
              v-for="variant in table.variants"
              :key="variant._id"
              class="flex items-center justify-between text-sm"
            >
              <NuxtLink
                :to="`/tables/${table._id}/${variant._id}/edit`"
                class="text-primary hover:underline font-medium"
              >
                {{ variant.title }}
              </NuxtLink>
              <span class="text-muted">
                {{ variant.rules.length }} rule{{ variant.rules.length !== 1 ? 's' : '' }}
                · {{ variant.probability }}%
              </span>
            </li>
          </ul>
        </UCard>
      </div>

      <!-- Champs -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">{{ $t('tables.fields') }}</h3>
        </template>
        <UTable :data="table.fields" :columns="fieldColumns">
          <template #type-cell="{ row }">
            <UBadge variant="outline" size="sm">{{ row.original.type }}</UBadge>
          </template>
        </UTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { DecisionTable, MatchingType, DecisionType } from '~/types/decision-table'

definePageMeta({ path: '/tables/:id/info', middleware: 'auth' })

const { t } = useI18n()
const route = useRoute()
const gandalf = useGandalf()

const tableId = route.params.id as string
const table = ref<DecisionTable | null>(null)
const loading = ref(true)
const saving = ref(false)
const editingTitle = ref(false)
const editingDescription = ref(false)
const editingTypes = ref(false)

// Snapshots pour annulation
let titleSnapshot = ''
let descriptionSnapshot = ''
let matchingTypeSnapshot: MatchingType = 'first'
let decisionTypeSnapshot: DecisionType = 'alpha_num'

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
  { label: t('nav.tables'), to: '/tables' },
  { label: table.value?.title || tableId },
])

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

function setMatchingType(type: MatchingType) {
  if (!table.value) return
  table.value.matching_type = type
  if (type !== 'first') table.value.decision_type = 'numeric'
}

function cancelEdit(field: 'title' | 'description' | 'types') {
  if (!table.value) return
  if (field === 'title') { table.value.title = titleSnapshot; editingTitle.value = false }
  if (field === 'description') { table.value.description = descriptionSnapshot; editingDescription.value = false }
  if (field === 'types') {
    table.value.matching_type = matchingTypeSnapshot
    table.value.decision_type = decisionTypeSnapshot
    editingTypes.value = false
  }
}

// Capture les snapshots avant édition
watch(editingTitle, (val) => { if (val && table.value) titleSnapshot = table.value.title })
watch(editingDescription, (val) => { if (val && table.value) descriptionSnapshot = table.value.description ?? '' })
watch(editingTypes, (val) => {
  if (val && table.value) {
    matchingTypeSnapshot = table.value.matching_type
    decisionTypeSnapshot = table.value.decision_type
  }
})

async function saveTableInfo() {
  if (!table.value) return
  saving.value = true
  try {
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
    editingTitle.value = false
    editingDescription.value = false
    editingTypes.value = false
  }
  finally { saving.value = false }
}

const fieldColumns = computed(() => [
  { accessorKey: 'key', header: t('fields.key') },
  { accessorKey: 'title', header: t('fields.title') },
  { accessorKey: 'type', header: t('fields.type') },
])

async function confirmDelete() {
  if (!table.value) return
  if (!confirm(`Delete table "${table.value.title}"?`)) return
  try {
    await gandalf.tables.delete(tableId)
    await navigateTo('/tables')
  }
  catch {
    // TODO: toast error
  }
}
</script>
