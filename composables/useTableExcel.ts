import type { TableImportConflict, TableImportError } from '~/types/decision-table'

/**
 * Logique partagée d'export/import Excel round-trip d'une table de décision.
 *
 * Export : télécharge le classeur (une variante par fichier) via un blob +
 * ancre temporaire. Import : envoie le fichier en multipart ; gère les trois
 * issues — succès (200 mise à jour / 201 création), conflit 409 (verrou
 * optimiste, l'appelant affiche une confirmation puis rappelle avec force),
 * erreurs 422 (liste adressée par cellule à afficher).
 */
export function useTableExcel() {
  const gandalf = useGandalf()
  const toast = useToast()
  const { t } = useI18n()

  const exporting = ref(false)
  const importing = ref(false)
  /** Erreurs 422 de la dernière tentative d'import (vidées à chaque essai). */
  const importErrors = ref<TableImportError[]>([])
  /** Détails du conflit 409 en attente de décision utilisateur. */
  const conflict = ref<TableImportConflict | null>(null)
  /** Fichier retenu pendant la résolution du conflit (pour le retry force). */
  const pendingFile = ref<File | null>(null)

  async function exportExcel(tableId: string, variantId?: string) {
    exporting.value = true
    try {
      const { blob, filename } = await gandalf.tables.exportExcel(tableId, variantId)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    }
    catch {
      toast.add({ title: t('tables.exportError'), color: 'error' })
    }
    finally {
      exporting.value = false
    }
  }

  /**
   * Importe le fichier. Retourne la table mise à jour/créée en cas de succès,
   * null sinon (conflit ouvert ou erreurs affichées).
   */
  async function importFile(file: File, opts: { force?: boolean } = {}) {
    importing.value = true
    importErrors.value = []
    conflict.value = null
    try {
      const response = await gandalf.tables.importFile(file, { force: opts.force })
      pendingFile.value = null
      toast.add({ title: t('tables.importSuccess'), color: 'success' })
      return response.data
    }
    catch (err: unknown) {
      const fetchError = err as { statusCode?: number; status?: number; data?: unknown }
      const status = fetchError.statusCode ?? fetchError.status
      // L'API enveloppe toutes les réponses dans {meta, data} (Nebo15) —
      // le corps utile du 409/422 est donc sous err.data.data.
      const envelope = fetchError.data as { data?: unknown } | undefined
      const body = (envelope?.data ?? envelope) as Partial<TableImportConflict> & { errors?: TableImportError[] | string[]; message?: string }

      if (status === 409 && body?.error === 'table_conflict') {
        // Verrou optimiste : garder le fichier et laisser l'UI proposer force=1
        conflict.value = body as TableImportConflict
        pendingFile.value = file
        return null
      }
      if (status === 422 && Array.isArray(body?.errors)) {
        // Erreurs adressées par cellule (v2) ou chaînes brutes (formats legacy)
        importErrors.value = body.errors.map(e =>
          typeof e === 'string'
            ? { cell: null, row: null, column: null, field: null, message: e }
            : e,
        )
        return null
      }
      if (status === 404) {
        importErrors.value = [{ cell: null, row: null, column: null, field: null, message: t('tables.importNotFound') }]
        return null
      }
      toast.add({ title: t('tables.importError'), color: 'error' })
      return null
    }
    finally {
      importing.value = false
    }
  }

  /** Résolution du conflit : réessaie avec force=1 le fichier en attente. */
  async function forceImport() {
    const file = pendingFile.value
    conflict.value = null
    if (!file) return null
    return importFile(file, { force: true })
  }

  function dismissConflict() {
    conflict.value = null
    pendingFile.value = null
  }

  return {
    exporting,
    importing,
    importErrors,
    conflict,
    exportExcel,
    importFile,
    forceImport,
    dismissConflict,
  }
}
