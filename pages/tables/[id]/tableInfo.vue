<!-- Onglet "Info" de la page de détail d'une table de décision. Le contenu
     affiché est celui de la version active ; les changements de contenu
     (variantes) partent dans un brouillon (gandalf.api, VERSIONS.md). -->
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

        <div class="flex items-center gap-2">
          <DecisionTableExcelExportImport :table-id="tableId" @imported="onImported" />
          <UButton
            v-if="isAdmin && table"
            icon="i-lucide-copy"
            variant="ghost"
            title="Copier vers un autre projet"
            @click="() => { if (table) copyMove = { mode: 'copy', item: table } }"
          />
          <UButton
            v-if="isAdmin && table"
            icon="i-lucide-corner-up-right"
            variant="ghost"
            title="Déplacer vers un autre projet"
            @click="() => { if (table) copyMove = { mode: 'move', item: table } }"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            @click="confirmDelete"
          />
        </div>
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
              <div class="flex justify-between items-center">
                <dt class="text-muted">Catégorie</dt>
                <dd>
                  <CategoryBadge
                    v-if="currentCategory"
                    :name="currentCategory.name"
                    :color="currentCategory.color"
                    size="sm"
                  />
                  <span v-else class="text-muted">—</span>
                </dd>
              </div>
              <div class="flex justify-between items-center">
                <dt class="text-muted">{{ $t('versions.activeVersion') }}</dt>
                <dd>
                  <NuxtLink :to="`/tables/${tableId}/versions`" class="text-primary hover:underline">
                    {{ activeVersionLabel }}
                  </NuxtLink>
                  <span v-if="draftCount" class="text-muted"> · {{ $t('versions.draftsCount', { count: draftCount }) }}</span>
                </dd>
              </div>
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
                <p class="text-xs font-semibold text-muted uppercase mb-2">Catégorie</p>
                <CategorySelect v-model="table.category_id" :categories="categories" />
              </div>

              <p v-if="typesLocked" class="text-xs text-muted">{{ $t('versions.typesLocked') }}</p>

              <div>
                <p class="text-xs font-semibold text-muted uppercase mb-2">{{ $t('tables.tableType') }}</p>
                <div class="flex gap-1">
                  <UButton size="sm" :disabled="typesLocked" :variant="isDecisionType ? 'solid' : 'outline'" @click="setMatchingType('first')">
                    Decision
                  </UButton>
                  <UButton size="sm" :disabled="typesLocked" :variant="!isDecisionType ? 'solid' : 'outline'" @click="setMatchingType(!isDecisionType ? table.matching_type : 'scoring_sum')">
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
                    :disabled="typesLocked"
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
                    :disabled="typesLocked"
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
            <div>
              <h3 class="font-semibold">{{ $t('tables.variants') }}</h3>
              <p class="text-xs text-muted">{{ $t('versions.variantsInDraft') }}</p>
            </div>
          </template>
          <ul class="space-y-2">
            <li
              v-for="variant in table.variants"
              :key="variant._id"
              class="flex items-center justify-between gap-4 text-sm"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <NuxtLink
                    :to="`/tables/${table._id}/${variant._id}/edit`"
                    class="text-primary hover:underline font-medium"
                  >
                    {{ variant.title }}
                  </NuxtLink>
                </div>
                <p v-if="variant.description" class="text-xs text-muted truncate">{{ variant.description }}</p>
              </div>
              <span class="flex items-center gap-2 text-muted shrink-0">
                {{ variant.rules.length }} rule{{ variant.rules.length !== 1 ? 's' : '' }}
                · {{ variant.probability }}%
                <UButton
                  icon="i-lucide-download"
                  variant="ghost"
                  size="xs"
                  :title="$t('tables.exportExcel')"
                  @click="excel.exportExcel(tableId, variant._id)"
                />
                <UButton
                  icon="i-lucide-copy-plus"
                  variant="ghost"
                  size="xs"
                  :title="$t('tables.variantCopy')"
                  :disabled="saving"
                  @click="openVariantAction('copy', variant)"
                />
                <UButton
                  icon="i-lucide-pencil"
                  variant="ghost"
                  size="xs"
                  :title="$t('tables.variantEdit')"
                  :disabled="saving"
                  @click="openVariantAction('edit', variant)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  :disabled="saving || table.variants.length < 2"
                  :title="table.variants.length < 2 ? $t('tables.variantLastOne') : $t('tables.variantDelete')"
                  @click="openVariantAction('delete', variant)"
                />
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

    <!-- Dupliquer / modifier / supprimer une variante -->
    <VariantModal
      v-if="variantAction"
      :mode="variantAction.mode"
      :variant="variantAction.variant"
      :submit="applyVariantAction"
      @close="variantAction = null"
    />

    <!-- Copier / déplacer vers un autre projet (admin) -->
    <CopyMoveModal
      v-if="copyMove"
      resource="table"
      :mode="copyMove.mode"
      :item="copyMove.item"
      @close="copyMove = null"
      @saved="onCopyMoveSaved"
    />
  </div>
</template>

<script setup lang="ts">
import type { DecisionTable, DecisionVariant, MatchingType, DecisionType } from '~/types/decision-table'
import type { Category } from '~/types/category'
import CategorySelect from '~/components/categories/CategorySelect.vue'
import CategoryBadge from '~/components/categories/CategoryBadge.vue'
import CopyMoveModal from '~/components/modals/CopyMoveModal.vue'
import VariantModal from '~/components/modals/VariantModal.vue'
import { copyVariant, removeVariant } from '~/utils/tableVariants'
import type { VariantInfo, VariantMode } from '~/utils/tableVariants'
import type { ImportResponse } from '~/composables/useGandalf'
import type { TableVersion, TableVersionSummary } from '~/types/version'
import { defaultDraftName, versionNumberLabel } from '~/utils/versions'

definePageMeta({ path: '/tables/:id/info', middleware: 'auth' })

const { t } = useI18n()
const route = useRoute()
const gandalf = useGandalf()
const projectsStore = useProjectsStore()
// Export Excel par variante (boutons de la carte "Variants")
const excel = useTableExcel()

const tableId = route.params.id as string
const table = ref<DecisionTable | null>(null)
const versions = ref<TableVersionSummary[]>([])
const loading = ref(true)

const activeVersionLabel = computed(() => {
  const active = versions.value.find(v => v.is_active)
  return active ? versionNumberLabel(active) : t('versions.noActive')
})
const draftCount = computed(() => versions.value.filter(v => v.status === 'draft').length)
// Types verrouillés dès qu'une version est publiée : en changer changerait le
// comportement de toutes les versions. Pour en changer, créer une nouvelle table.
const typesLocked = computed(() => versions.value.some(v => v.status === 'published'))

// Copier/déplacer vers un autre projet — admin uniquement.
const isAdmin = computed(() => projectsStore.isAdmin)
const copyMove = ref<{ mode: 'copy' | 'move'; item: DecisionTable } | null>(null)

function onCopyMoveSaved() {
  // Un déplacement retire la table du projet courant : revenir à la liste.
  if (copyMove.value?.mode === 'move') {
    navigateTo('/tables')
  }
}

// Catégories de l'application (pour l'affichage et le sélecteur).
const categories = ref<Category[]>([])
const categoryById = computed(() => new Map(categories.value.map(c => [c.id, c])))
const currentCategory = computed(() =>
  table.value?.category_id ? categoryById.value.get(table.value.category_id) ?? null : null,
)
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
    const [tableResponse, categoriesResponse, versionsResponse] = await Promise.all([
      gandalf.tables.getById(tableId),
      gandalf.categories.list().catch(() => ({ data: { categories: [] as Category[] } })),
      gandalf.tables.versions.list(tableId).catch(() => ({ data: [] as TableVersionSummary[] })),
    ])
    table.value = tableResponse.data
    categories.value = categoriesResponse.data.categories
    versions.value = versionsResponse.data
  }
  finally {
    loading.value = false
  }
  // Rôle projet, pour n'exposer copier/déplacer qu'aux admins.
  if (projectsStore.currentUserRole === null) {
    projectsStore.fetchCurrentUserRole()
  }
})

let categorySnapshot: string | null | undefined = null

/** Import Excel réussi : ouvre le brouillon écrit, ou rafraîchit la table. */
function onImported(imported: ImportResponse) {
  if (imported.meta?.imported_into === 'version') {
    navigateTo(draftEditLink(imported.data as TableVersion))
    return
  }
  const importedTable = imported.data as DecisionTable
  if (importedTable._id === tableId) {
    table.value = importedTable
  }
  else {
    // mode=create : nouvelle table — y naviguer
    navigateTo(`/tables/${importedTable._id}/info`)
  }
}

function draftEditLink(draft: TableVersion): string {
  const variant = draft.variants[0]?._id ?? table.value?.variants[0]?._id
  return `/tables/${tableId}/${variant}/edit?version=${draft._id}`
}

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
    table.value.category_id = categorySnapshot
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
    categorySnapshot = table.value.category_id
  }
})

// Seule l'identité est modifiée ici (titre, description, types, catégorie). Le
// contenu repart de la table enregistrée, relue juste avant : un onglet ouvert
// depuis longtemps ne renvoie pas un ancien contenu, que le mode de
// compatibilité publierait et activerait.
async function saveTableInfo() {
  if (!table.value) return
  saving.value = true
  try {
    // L'API remplace champs et variantes : ils repartent tels qu'elle les a renvoyés.
    const stored = (await gandalf.tables.getById(tableId)).data
    const { title, description, matching_type, decision_type, category_id } = table.value
    table.value = (await gandalf.tables.update(tableId, { ...stored, title, description, matching_type, decision_type, category_id })).data
    editingTitle.value = false
    editingDescription.value = false
    editingTypes.value = false
  }
  finally { saving.value = false }
}

// ── Variantes : dupliquer, modifier, supprimer ──────────────────────────────
const toast = useToast()
const variantAction = ref<{ mode: VariantMode; variant: DecisionVariant } | null>(null)

const VARIANT_SAVED_TOASTS = {
  copy: 'tables.variantCreated',
  edit: 'tables.variantUpdated',
  delete: 'tables.variantDeleted',
} as const

// L'action écrit dans un brouillon, pas dans la table : une édition en ligne
// en cours (titre, description, types) n'est ni envoyée ni perdue.
function openVariantAction(mode: VariantMode, variant: DecisionVariant) {
  if (saving.value) return
  variantAction.value = { mode, variant }
}

// Brouillon qui reçoit les actions sur les variantes de cette page : créé à la
// première, tiré de la version active, puis repris, pour que les changements
// se cumulent au lieu de partir chacun dans son brouillon.
const variantDraftId = ref<string | null>(null)

// Appelée par VariantModal ; une erreur de l'API remonte à la modale, qui
// l'affiche. La version active, figée, ne change pas.
async function applyVariantAction(info: VariantInfo) {
  const action = variantAction.value
  if (!table.value || !action) return
  const { mode, variant } = action
  const reused = variantDraftId.value
    ? (await gandalf.tables.versions.get(tableId, variantDraftId.value).catch(() => null))?.data ?? null
    : null
  // Un brouillon publié ou supprimé depuis n'est plus repris
  const draft = reused?.status === 'draft'
    ? reused
    : (await gandalf.tables.versions.create(tableId, { name: defaultDraftName() })).data
  const created = draft !== reused
  const inDraft = draft.variants.find(v => v._id === variant._id)
  if (mode !== 'copy' && !inDraft) {
    // Le message passe par data.message, que la modale affiche
    const message = t('versions.variantNotInDraft', { name: draft.name })
    throw Object.assign(new Error(message), { data: { message } })
  }
  const variants = mode === 'copy'
    ? [...draft.variants, copyVariant(inDraft ?? variant, info)]
    : mode === 'edit'
      ? draft.variants.map(v => (v._id === variant._id ? { ...v, ...info } : v))
      : removeVariant(draft.variants, variant._id, draft.variants_probability)
  let saved: TableVersion
  try {
    // Le contenu part entier : champs et répartition tels que le brouillon les a.
    saved = (await gandalf.tables.versions.update(tableId, draft._id, {
      fields: draft.fields,
      variants,
      variants_probability: draft.variants_probability,
    })).data
  }
  catch (err) {
    // Pas de brouillon vide laissé par une tentative refusée
    if (created) await gandalf.tables.versions.remove(tableId, draft._id).catch(() => null)
    throw err
  }
  variantDraftId.value = saved._id
  versions.value = [...versions.value.filter(v => v._id !== saved._id), saved]
  toast.add({
    title: t(VARIANT_SAVED_TOASTS[mode]),
    description: t('versions.savedInDraft', { name: saved.name }),
    color: 'success',
    actions: [{ label: t('versions.openDraft'), onClick: () => { navigateTo(draftEditLink(saved)) } }],
  })
}

const fieldColumns = computed(() => [
  { accessorKey: 'title', header: t('fields.title') },
  { accessorKey: 'key', header: t('fields.key') },
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
