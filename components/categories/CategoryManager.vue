<script setup lang="ts">
/**
 * Gestion des catégories de l'application (nom + couleur), depuis la page
 * d'administration du projet. Liste + création/édition (même modale) +
 * suppression, avec un aperçu de la pastille.
 *
 * Le backend expose un endpoint « remplace toute la liste » (PUT /categories),
 * pas un CRUD granulaire : chaque action mute une copie locale de la liste puis
 * envoie la liste entière. La réponse du serveur (ids générés pour les nouvelles
 * entrées, références orphelines nettoyées côté tables/flows) fait ensuite
 * autorité. Inspiré de la page catégories de genesis, adapté à ce contrat.
 */
import { reactive, ref, computed, onMounted } from 'vue'
import type { Category } from '~/types/category'
import { DEFAULT_CATEGORY_COLOR } from '~/composables/useCategoryColors'
import CategoryBadge from '~/components/categories/CategoryBadge.vue'
import ColorPalettePicker from '~/components/categories/ColorPalettePicker.vue'

const gandalf = useGandalf()
const toast = useToast()

const categories = ref<Category[]>([])
const loading = ref(true)

const countLabel = computed(() => {
  const n = categories.value.length
  return `${n} catégorie${n !== 1 ? 's' : ''}`
})

async function load() {
  loading.value = true
  try {
    const response = await gandalf.categories.list()
    categories.value = response.data.categories
  }
  catch {
    toast.add({ title: 'Impossible de charger les catégories.', color: 'error' })
  }
  finally {
    loading.value = false
  }
}

/**
 * Persiste une nouvelle version de la liste via l'endpoint replace-all et
 * adopte la réponse du serveur comme source de vérité.
 */
async function persist(next: Category[]): Promise<boolean> {
  saving.value = true
  try {
    const response = await gandalf.categories.replace(next)
    categories.value = response.data.categories
    return true
  }
  catch (e: unknown) {
    const message = (e as { data?: { message?: string } })?.data?.message
    toast.add({ title: message ?? 'Enregistrement impossible.', color: 'error' })
    return false
  }
  finally {
    saving.value = false
  }
}

// ── Modale création / édition (même formulaire) ─────────────────────────────
const showModal = ref(false)
const editingId = ref<string | null>(null) // null ⇒ création
const form = reactive({ name: '', color: DEFAULT_CATEGORY_COLOR })
const saving = ref(false)

const modalTitle = computed(() => (editingId.value ? 'Modifier la catégorie' : 'Nouvelle catégorie'))

function openCreate() {
  editingId.value = null
  form.name = ''
  form.color = DEFAULT_CATEGORY_COLOR
  showModal.value = true
}

function openEdit(category: Category) {
  editingId.value = category.id
  form.name = category.name
  form.color = category.color
  showModal.value = true
}

async function handleSave() {
  const name = form.name.trim()
  if (!name) return

  // Construit la liste cible à partir de la liste courante (les ids existants
  // sont conservés pour que le backend ne casse pas les références des tables/flows).
  let next: Category[]
  if (editingId.value) {
    next = categories.value.map(c =>
      c.id === editingId.value ? { ...c, name, color: form.color } : c,
    )
  }
  else {
    // Pas d'id : le backend en génère un. La couleur est déjà en MAJ dans la palette.
    next = [...categories.value, { id: '', name, color: form.color }]
  }

  const ok = await persist(next)
  if (ok) {
    toast.add({ title: editingId.value ? 'Catégorie modifiée' : 'Catégorie créée', color: 'success' })
    showModal.value = false
  }
}

// ── Suppression ─────────────────────────────────────────────────────────────
const deletingTarget = ref<Category | null>(null)

async function confirmDelete() {
  if (!deletingTarget.value) return
  const target = deletingTarget.value
  const next = categories.value.filter(c => c.id !== target.id)
  const ok = await persist(next)
  if (ok) {
    toast.add({ title: 'Catégorie supprimée', color: 'success' })
    deletingTarget.value = null
  }
}

onMounted(load)
</script>

<template>
  <UCard class="mb-6 shadow-md">
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold">Catégories</h3>
          <p class="text-xs text-muted mt-0.5">{{ countLabel }}</p>
        </div>
        <UButton size="sm" icon="i-lucide-plus" variant="outline" @click="openCreate">
          Nouvelle catégorie
        </UButton>
      </div>
    </template>

    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-2xl text-primary" />
    </div>

    <div v-else-if="categories.length === 0" class="text-center py-8 text-muted">
      <UIcon name="i-lucide-tag" class="text-4xl mb-2 opacity-40" />
      <p class="text-sm">Aucune catégorie. Créez-en une pour regrouper vos tables et vos flows.</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="category in categories"
        :key="category.id"
        class="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-default hover:shadow-sm transition-shadow"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span class="w-4 h-4 rounded-full shrink-0" :style="{ backgroundColor: category.color }" />
          <CategoryBadge :name="category.name" :color="category.color" />
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <UButton
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="xs"
            title="Modifier"
            @click="openEdit(category)"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            title="Supprimer"
            @click="() => { deletingTarget = category }"
          />
        </div>
      </div>
    </div>

    <!-- Modale création / édition -->
    <UModal v-model:open="showModal">
      <template #header>
        <h3 class="text-base font-semibold">{{ modalTitle }}</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="Nom">
            <UInput
              v-model="form.name"
              placeholder="Ex. Tarification"
              autofocus
              class="inline-full"
              @keyup.enter="handleSave"
            />
          </UFormField>
          <UFormField label="Couleur">
            <div class="space-y-3">
              <ColorPalettePicker v-model="form.color" />
              <div class="flex items-center gap-2 text-xs text-muted">
                <span>Aperçu :</span>
                <CategoryBadge :name="form.name.trim() || 'Catégorie'" :color="form.color" />
              </div>
            </div>
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" color="neutral" @click="() => { showModal = false }">Annuler</UButton>
          <UButton :loading="saving" :disabled="!form.name.trim()" @click="handleSave">
            {{ editingId ? 'Enregistrer' : 'Créer' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Confirmation suppression -->
    <UModal
      :open="deletingTarget !== null"
      @update:open="(v: boolean) => { if (!v) deletingTarget = null }"
    >
      <template #header>
        <h3 class="text-base font-semibold">Supprimer la catégorie</h3>
      </template>
      <template #body>
        <p class="text-sm">
          Supprimer «&nbsp;<strong>{{ deletingTarget?.name }}</strong>&nbsp;» ?
          Les tables et flows qui l'utilisent seront simplement détachés (non supprimés).
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" color="neutral" @click="() => { deletingTarget = null }">Annuler</UButton>
          <UButton color="error" :loading="saving" @click="confirmDelete">Supprimer</UButton>
        </div>
      </template>
    </UModal>
  </UCard>
</template>
