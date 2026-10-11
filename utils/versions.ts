// Règles des versions de table côté interface (gandalf.api, VERSIONS.md).
// Pures et testées : la page Versions, l'éditeur et la page de test s'en servent.
import type { SplitMode, VersionSummary } from '~/types/version'

type VersionLink = Pick<VersionSummary, '_id' | 'origin_version_id'>

// Garde-fou contre une chaîne d'origines anormalement longue ou cyclique
const MAX_ORIGIN_DEPTH = 100

/**
 * Vrai si la version est `ancestorId`, ou en descend en suivant ses origines
 * (même règle que l'API, TableVersionsRepository::descendsFrom).
 */
export function descendsFrom(versionId: string, ancestorId: string, versions: VersionLink[]): boolean {
  const originOf = new Map(versions.map(v => [v._id, v.origin_version_id]))
  const seen = new Set<string>()
  let id: string | null | undefined = versionId
  for (let depth = 0; id && depth < MAX_ORIGIN_DEPTH; depth++) {
    if (id === ancestorId) return true
    if (seen.has(id)) return false
    seen.add(id)
    id = originOf.get(id)
  }
  return false
}

/**
 * La version active, quand `version` n'en descend pas : activer ou publier
 * `version` laisserait de côté les changements publiés depuis qu'elle en est
 * partie (ou c'est un retour en arrière). Null sinon.
 */
export function divergence<T extends VersionSummary>(version: VersionLink, versions: T[]): T | null {
  const active = versions.find(v => v.is_active)
  if (!active || active._id === version._id) return null
  return descendsFrom(version._id, active._id, versions) ? null : active
}

/** « v3 » pour une version publiée, null pour un brouillon. */
export function versionNumberLabel(version: Pick<VersionSummary, 'number' | 'status'>): string | null {
  return version.status === 'published' && version.number !== null ? `v${version.number}` : null
}

/** Brouillons d'abord (dernier modifié en premier), puis versions publiées (plus récente en premier). */
export function sortVersions<T extends Pick<VersionSummary, 'status' | 'number' | 'updated_at'>>(versions: T[]): T[] {
  return [...versions].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'draft' ? -1 : 1
    if (a.status === 'published') return (b.number ?? 0) - (a.number ?? 0)
    return b.updated_at.localeCompare(a.updated_at)
  })
}

/** Somme des pourcentages, et validité d'une répartition (100 % en mode percent). */
export function splitTotal(variants: { probability: number }[]): number {
  return variants.reduce((total, v) => total + (Number(v.probability) || 0), 0)
}

export function isSplitValid(mode: SplitMode, variants: { probability: number }[]): boolean {
  return mode !== 'percent' || splitTotal(variants) === 100
}

/** Nom proposé pour un brouillon créé depuis l'éditeur. */
export function defaultDraftName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}
