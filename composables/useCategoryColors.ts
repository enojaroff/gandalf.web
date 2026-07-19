/**
 * Palette de couleurs prédéfinies pour les catégories (tables & flows) + helpers
 * purs (hors `.vue`) pour rester testables. On impose une palette fixe (couleurs
 * Tailwind 500) plutôt qu'une saisie hex libre : couleurs cohérentes et toujours
 * lisibles, alignées sur l'esthétique de l'UI. Repris de genesis pour une
 * présentation homogène entre les deux produits.
 */

/** Couleurs sélectionnables (hex majuscule, comme stocké/normalisé par le backend). */
export const CATEGORY_COLORS: readonly string[] = [
  '#EF4444', // red-500
  '#F97316', // orange-500
  '#F59E0B', // amber-500
  '#EAB308', // yellow-500
  '#7CCF00', // lime-500
  '#22C55E', // green-500
  '#00B7D7', // cyan-500
  '#3B82F6', // blue-500
  '#6366F1', // indigo-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#64748B', // slate-500
  '#CAD5E2', // slate-300
] as const

/** Couleur par défaut proposée à la création d'une catégorie. */
export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS[0]

/**
 * Couleur de texte lisible (#000 ou #FFF) sur un fond hex donné, via la luminance
 * relative (recommandation WCAG simplifiée). Garantit un badge lisible quelle que
 * soit la couleur de la catégorie. Retourne #000 pour une entrée invalide (défensif).
 */
export function textColorOn(bgHex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(bgHex.trim())
  if (!m) return '#000000'
  const int = parseInt(m[1], 16)
  const r = (int >> 16) & 0xff
  const g = (int >> 8) & 0xff
  const b = int & 0xff
  // Luminance perçue (coefficients ITU-R BT.601).
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.66 ? '#000000' : '#FFFFFF'
}

/** Vrai si la chaîne est une couleur hex `#RRGGBB` valide (miroir de la garde backend). */
export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value.trim())
}
