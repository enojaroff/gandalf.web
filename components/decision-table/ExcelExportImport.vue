<!--
  Boutons "Exporter Excel" / "Importer Excel" pour une table de décision,
  avec gestion complète du flux round-trip :
   - export : télécharge la variante donnée (ou la variante par défaut) ;
   - import : sélecteur de fichier caché → upload multipart ;
   - conflit 409 (verrou optimiste) : modal proposant d'écraser (force=1) ;
   - erreurs 422 : alerte listant chaque problème avec son adresse de cellule.
  Émet 'imported' avec la table renvoyée par l'API pour que la page rafraîchisse.
-->
<template>
  <div class="flex gap-2 items-center">
    <UButton
      icon="i-lucide-download"
      variant="outline"
      size="sm"
      :loading="exporting"
      @click="exportExcel(tableId, variantId)"
    >
      {{ $t('tables.exportExcel') }}
    </UButton>
    <UButton
      icon="i-lucide-upload"
      variant="outline"
      size="sm"
      :loading="importing"
      @click="fileInput?.click()"
    >
      {{ $t('tables.importExcel') }}
    </UButton>
    <input
      ref="fileInput"
      type="file"
      accept=".xlsx,.xls,.csv,.json"
      class="hidden"
      @change="onFileSelected"
    >

    <!-- Erreurs d'import (422) — adressées par cellule -->
    <UModal :open="importErrors.length > 0" @update:open="importErrors = []">
      <template #header>
        <h3 class="text-base font-semibold">{{ $t('tables.importErrorsTitle') }}</h3>
      </template>
      <template #body>
        <UAlert icon="i-lucide-alert-triangle" color="error" variant="soft">
          <template #description>
            <ul class="list-disc pl-5 space-y-1 max-h-80 overflow-y-auto">
              <li v-for="(err, i) in importErrors" :key="i" class="text-sm">
                {{ err.message }}
              </li>
            </ul>
          </template>
        </UAlert>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton variant="outline" @click="importErrors = []">{{ $t('common.close') }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- Conflit 409 : la table a changé depuis l'export -->
    <UModal :open="conflict !== null" @update:open="dismissConflict">
      <template #header>
        <h3 class="text-base font-semibold">{{ $t('tables.importConflictTitle') }}</h3>
      </template>
      <template #body>
        <div class="space-y-3">
          <UAlert icon="i-lucide-alert-triangle" color="warning" variant="soft" :description="$t('tables.importConflictBody')" />
          <div v-if="conflict" class="text-xs text-muted space-y-1">
            <p>{{ $t('tables.importConflictServer') }} : {{ formatDate(conflict.server_updated_at) }}</p>
            <p>{{ $t('tables.importConflictFile') }} : {{ formatDate(conflict.file_exported_at) }}</p>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <UButton variant="outline" @click="dismissConflict">{{ $t('common.cancel') }}</UButton>
          <UButton color="warning" icon="i-lucide-alert-triangle" @click="onForce">
            {{ $t('tables.importForce') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { DecisionTable } from '~/types/decision-table'

defineProps<{
  tableId: string
  /** Variante à exporter ; absente = variante par défaut de la table. */
  variantId?: string
}>()

const emit = defineEmits<{
  /** Import réussi — la page doit recharger la table (200 update / 201 create). */
  imported: [table: DecisionTable]
}>()

const {
  exporting,
  importing,
  importErrors,
  conflict,
  exportExcel,
  importFile,
  forceImport,
  dismissConflict,
} = useTableExcel()

const fileInput = ref<HTMLInputElement | null>(null)

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Réinitialiser pour permettre de re-sélectionner le même fichier
  input.value = ''
  if (!file) return
  const table = await importFile(file)
  if (table) emit('imported', table)
}

async function onForce() {
  const table = await forceImport()
  if (table) emit('imported', table)
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return isNaN(date.getTime()) ? iso : date.toLocaleString()
}
</script>
