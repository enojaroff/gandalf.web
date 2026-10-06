// Clés de champ : forme stockée par l'API (Field::normalizeKey) et règles de saisie,
// communes à l'ajout et au renommage d'un champ.

export function normalizeFieldKey(key: string): string {
  return key.trim().replace(/ /g, '_').toLowerCase()
}

export type FieldKeyError = 'fields.keyRequired' | 'fields.keyInvalid' | 'fields.keyReserved' | 'fields.keyDuplicate'

// Erreur (clé de traduction) pour une clé déjà normalisée, ou null si elle est
// acceptable. `others` : clés des autres champs actifs de la table.
export function fieldKeyError(key: string, others: string[]): FieldKeyError | null {
  if (!key) return 'fields.keyRequired'
  if (!/^[a-z0-9_-]+$/.test(key)) return 'fields.keyInvalid'
  // Nom réservé : paramètre de l'API de décision (choix de la variante)
  if (key === 'variant_id') return 'fields.keyReserved'
  if (others.map(normalizeFieldKey).includes(key)) return 'fields.keyDuplicate'
  return null
}
