// Types de champ
export type FieldType = 'numeric' | 'string' | 'boolean'

// Source d'un champ
export type FieldSource = 'request' | 'tables' | 'decisions' | 'external'

// Type de matching (algorithme d'évaluation)
export type MatchingType =
  | 'first'
  | 'scoring_sum'
  | 'scoring_max'
  | 'scoring_min'
  | 'scoring_count'

// Type de décision (type de valeur retournée)
export type DecisionType = 'alpha_num' | 'string' | 'numeric' | 'json'

// Opérateurs de condition
export type ConditionOperator =
  | '$eq'
  | '$ne'
  | '$gt'
  | '$gte'
  | '$lt'
  | '$lte'
  | '$in'
  | '$nin'
  | '$contains'
  | '$not_contains'
  | '$starts_with'
  | '$ends_with'
  | '$is_set'
  | '$is_null'
  | '$between'
  | '$not_between'

// Champ d'une table de décision
export interface DecisionField {
  _id: string
  key: string
  type: FieldType
  title: string
  source?: FieldSource
  preset?: unknown
  defaultValue?: unknown
  isDeleted?: boolean
}

// Condition d'une règle
export interface RuleCondition {
  _id?: string
  field_key: string
  condition: ConditionOperator | null
  value: unknown
}

// Règle de décision
export interface DecisionRule {
  _id: string
  priority: number
  than: unknown
  title: string | null
  description: string | null
  conditions: RuleCondition[]
  isDeleted?: boolean
}

// Variante d'une table
export interface DecisionVariant {
  _id: string
  title: string
  description?: string
  probability: number
  default_decision: unknown
  default_title?: string | null
  default_description?: string | null
  rules: DecisionRule[]
}

// Table de décision complète
export interface DecisionTable {
  _id: string
  title: string
  description?: string
  matching_type: MatchingType
  decision_type: DecisionType
  variants_probability?: string
  fields: DecisionField[]
  variants: DecisionVariant[]
}

// Entrée de changelog
export interface TableChangelog {
  _id: string
  table_id: string
  created_at: string
  author?: {
    id: string
    username: string
  }
}

// Diff entre deux versions
export interface DiffTable {
  current: DecisionTable
  compare: DecisionTable
  diff: {
    fields: unknown[]
    rules: unknown[]
  }
}
