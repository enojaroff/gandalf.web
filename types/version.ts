// Versions des tables de décision (gandalf.api, VERSIONS.md) : brouillons,
// versions publiées et figées, version active exécutée par l'API.
import type { DecisionField, DecisionVariant } from '~/types/decision-table'

export type VersionStatus = 'draft' | 'published'

// Version sans son contenu, telle que listée par GET …/versions
export interface TableVersionSummary {
  _id: string
  table_id: string
  status: VersionStatus
  // Attribué à la publication ; null pour un brouillon
  number: number | null
  name: string
  comment: string
  origin_version_id: string | null
  // Publiée par le mode de compatibilité ou la migration, pas par une personne
  autopublished: boolean
  variants_probability: string
  created_by: string | null
  published_by: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface TableVersion extends TableVersionSummary {
  fields: DecisionField[]
  variants: DecisionVariant[]
}

// Avertissement renvoyé à la publication ou à l'activation d'une version qui ne
// descend pas de la version active
export interface VersionDivergence {
  warning?: 'version_diverges'
  active_version?: { _id: string; number: number }
}

// Appels récents d'une clé d'API (GET …/calls)
export interface VersionCall {
  consumer: string
  description: string
  // Numéro demandé ; null : sans version, donc la version active
  requested_version: number | null
  last_call_at: string
  count: number
}

// Flow qui utilise une table (GET …/tables/{id}/flows)
export interface TableFlowUsage {
  _id: string
  title: string
  active_version: { _id: string; number: number } | null
  nodes: { node_id: string; table_version: { _id: string; number: number | null } | null }[]
  outdated: boolean
}

export interface ActivationMeta extends VersionDivergence {
  callers_without_version?: VersionCall[]
  flows_outdated?: TableFlowUsage[]
  field_renames?: Record<string, string>
}

// Résultat de la mise à jour des flows vers la version active
export interface FlowUpdateResult {
  _id: string
  title: string
  status: 'updated' | 'up_to_date' | 'incompatible'
  version: { _id: string; number: number | null; status: VersionStatus } | null
  errors: string[]
}

export type SplitMode = 'first' | 'random' | 'percent'
