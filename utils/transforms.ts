import type { MatchingType, DecisionType } from '~/types/decision-table'

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
  hasNotValue: ['$is_set', '$is_null'],
}

export const CONDITION_TYPES = {
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
  NOT_BETWEEN: '$not_between' as const,
}
