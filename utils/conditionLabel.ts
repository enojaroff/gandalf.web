// Libellé en lecture seule d'une condition de règle (« = moquette », « [3 - 6[ »,
// « ≥ 24 », « --- » pour « peu importe »…), dans la notation du mode affichage
// de l'éditeur de table (components/decision-table/DecisionTable.vue), avec les
// opérateurs en toutes lettres traduits (conditions.*). Sert au détail d'une
// décision de l'historique.
import type { FieldType, RuleCondition } from '~/types/decision-table'
import { dateExprLabel } from '~/utils/dateExpr'

type Translate = (key: string) => string

const SYMBOL_OPS: Record<string, string> = {
  $eq: '=',
  $ne: '≠',
  $gt: '>',
  $gte: '≥',
  $lt: '<',
  $lte: '≤',
}

const WORD_OPS: Record<string, string> = {
  $contains: 'conditions.contains',
  $not_contains: 'conditions.notContains',
  $starts_with: 'conditions.startsWith',
  $ends_with: 'conditions.endsWith',
  $in: 'conditions.in',
  $nin: 'conditions.nin',
  $not_between: 'conditions.notBetween',
}

// Bornes incluses « [ ] » ou exclues « ] [ » de chaque intervalle. $not_between
// exclut l'intervalle [x - y], bornes comprises (ConditionsTypes côté API).
const RANGE_BRACKETS: Record<string, [string, string]> = {
  $between: ['[', ']'],
  $between_excl: [']', '['],
  $between_lexcl: [']', ']'],
  $between_rexcl: ['[', '['],
  $not_between: ['[', ']'],
}

// L'API compare une condition booléenne avec == (PHP) : '0', '', 0, null et []
// valent faux, alors que '0' et [] sont vrais en JavaScript.
function phpTruthy(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  return !(value === false || value === null || value === undefined || value === 0 || value === '' || value === '0')
}

function scalarLabel(value: unknown, fieldType: FieldType | undefined, t: Translate): string {
  if (fieldType === 'boolean') return t(phpTruthy(value) ? 'common.true' : 'common.false')
  if (fieldType === 'date') return dateExprLabel(value, t)
  return value === null || value === undefined || value === '' ? '—' : String(value)
}

// Intervalle : "x;y" (format API) ou [x, y]
function rangeLabel(value: unknown, fieldType: FieldType | undefined, t: Translate): string {
  const bounds = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.includes(';') ? value.split(';') : null
  if (!bounds) return scalarLabel(value, fieldType, t)
  return `${scalarLabel(bounds[0], fieldType, t)} - ${scalarLabel(bounds[1], fieldType, t)}`
}

function valueLabel(value: unknown, fieldType: FieldType | undefined, t: Translate): string {
  if (Array.isArray(value)) return value.map(v => scalarLabel(v, fieldType, t)).join(', ')
  return scalarLabel(value, fieldType, t)
}

export function conditionLabel(
  condition: Pick<RuleCondition, 'condition' | 'value'>,
  fieldType: FieldType | undefined,
  t: Translate,
): string {
  const op = condition.condition ?? ''
  if (op === '$any') return '---'
  if (op === '$is_set') return '◉'
  if (op === '$is_null') return '∅'
  if (op === '$eq' && fieldType === 'boolean') return scalarLabel(condition.value, fieldType, t)

  const brackets = RANGE_BRACKETS[op]
  const value = brackets
    ? `${brackets[0]}${rangeLabel(condition.value, fieldType, t)}${brackets[1]}`
    : valueLabel(condition.value, fieldType, t)

  const opLabel = SYMBOL_OPS[op]
    ?? (WORD_OPS[op] ? t(WORD_OPS[op]) : brackets ? '' : op || '?')
  return opLabel ? `${opLabel} ${value}` : value
}
