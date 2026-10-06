import type { MatchingType, DecisionType, FieldType, RuleCondition } from '~/types/decision-table'
import { isValidDateCondition } from '~/utils/dateExpr'

function anyToString(val: unknown): string {
  return typeof val !== 'undefined' ? String(val) : ''
}

function anyToNumber(val: unknown): number {
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

function anyToJSON(val: unknown): string {
  return JSON.stringify(typeof val !== 'undefined' ? val : {})
}

function anyToAlphaNum(val: unknown): string {
  const reg = /[a-zA-Z0-9_-]+/gmi
  return (String(val).match(reg) || []).join('')
}

interface TransformConfig {
  decisionType?: DecisionType
  transformFn: (val: unknown) => unknown
}

export const GANDALF_TRANSFORMS: {
  matchingType: Partial<Record<MatchingType, TransformConfig>>
  decisionType: Partial<Record<DecisionType, TransformConfig>>
} = {
  matchingType: {
    scoring_sum: { decisionType: 'numeric', transformFn: anyToNumber },
    scoring_max: { decisionType: 'numeric', transformFn: anyToNumber },
    scoring_min: { decisionType: 'numeric', transformFn: anyToNumber },
    scoring_count: { decisionType: 'numeric', transformFn: anyToNumber },
    first: { decisionType: 'alpha_num', transformFn: anyToString },
  },
  decisionType: {
    string: { transformFn: anyToString },
    numeric: { transformFn: anyToNumber },
    alpha_num: { transformFn: anyToAlphaNum },
    json: { transformFn: anyToJSON },
  },
}

export const CONDITION_OPTIONS = {
  hasNotValue: ['$is_set', '$is_null', '$any'],
}

const NUMERIC_VALUE_OPS = ['$gt', '$gte', '$lt', '$lte']
const RANGE_OPS = ['$between', '$between_excl', '$between_lexcl', '$between_rexcl', '$not_between']

function isNumericValue(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value.replace(',', '.')))
}

// Même règle que l'API (TableValidator::conditionType) : la condition serait-elle
// acceptée sur un champ de ce type ? Sert à nettoyer les conditions quand le type
// d'un champ change, sinon l'enregistrement de la table échouerait.
export function isConditionValidForType(type: FieldType, condition: RuleCondition): boolean {
  const op = condition.condition ?? '$any'
  if (type === 'date') return isValidDateCondition(op, condition.value)
  if (CONDITION_OPTIONS.hasNotValue.includes(op)) return true
  if (NUMERIC_VALUE_OPS.includes(op)) return isNumericValue(condition.value)
  if (RANGE_OPS.includes(op)) {
    const bounds = typeof condition.value === 'string' ? condition.value.split(';') : []
    if (bounds.length !== 2 || !bounds.every(isNumericValue)) return false
    const [min, max] = bounds.map(b => Number(b.replace(',', '.')))
    return min! < max!
  }
  return true
}

export const CONDITION_TYPES = {
  ANY: '$any' as const,
  IS_SET: '$is_set' as const,
  IS_NULL: '$is_null' as const,
  EQ: '$eq' as const,
  NE: '$ne' as const,
  GT: '$gt' as const,
  GTE: '$gte' as const,
  LT: '$lt' as const,
  LTE: '$lte' as const,
  IN: '$in' as const,
  NIN: '$nin' as const,
  CONTAINS: '$contains' as const,
  NOT_CONTAINS: '$not_contains' as const,
  STARTS_WITH: '$starts_with' as const,
  ENDS_WITH: '$ends_with' as const,
  BETWEEN: '$between' as const,
  BETWEEN_EXCL: '$between_excl' as const,
  BETWEEN_LEXCL: '$between_lexcl' as const,
  BETWEEN_REXCL: '$between_rexcl' as const,
  NOT_BETWEEN: '$not_between' as const,
}
