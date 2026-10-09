// Libellé en lecture seule d'une condition de règle (« = moquette », « [3 - 6[ »,
// « ≥ 24 », « --- » pour « peu importe »…) — même rendu que le mode affichage de
// l'éditeur de table (components/decision-table/DecisionTable.vue), à garder
// aligné avec lui. Sert au détail d'une décision de l'historique.
import type { FieldType, RuleCondition } from '~/types/decision-table'
import { dateExprLabel } from '~/utils/dateExpr'

type Translate = (key: string) => string

const OP_LABELS: Record<string, string> = {
  $eq: '=',
  $ne: '≠',
  $gt: '>',
  $gte: '≥',
  $lt: '<',
  $lte: '≤',
  $between: '',
  $between_excl: '',
  $between_lexcl: '',
  $between_rexcl: '',
  $not_between: 'not between',
  $contains: 'contains',
  $not_contains: "doesn't contain",
  $starts_with: 'starts with',
  $ends_with: 'ends with',
  $in: 'in',
  $nin: 'not in',
}

// Bornes incluses « [ ] » ou exclues « ] [ » de chaque intervalle
const BETWEEN_BRACKETS: Record<string, { left: string, right: string }> = {
  $between: { left: '[', right: ']' },
  $between_excl: { left: ']', right: '[' },
  $between_lexcl: { left: ']', right: ']' },
  $between_rexcl: { left: '[', right: '[' },
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

// Valeur d'un intervalle : "x;y" (format API) ou [x, y]
function rangeLabel(value: unknown, fieldType: FieldType | undefined, t: Translate): string {
  if (Array.isArray(value)) return `${value[0]} - ${value[1]}`
  if (typeof value === 'string' && value.includes(';')) {
    const [x, y] = value.split(';')
    return fieldType === 'date' ? `${dateExprLabel(x, t)} - ${dateExprLabel(y, t)}` : `${x} - ${y}`
  }
  return isEmpty(value) ? '—' : String(value)
}

function valueLabel(value: unknown, fieldType: FieldType | undefined, t: Translate): string {
  if (fieldType === 'date') return dateExprLabel(value, t)
  if (Array.isArray(value)) return `${value[0]} – ${value[1]}`
  return isEmpty(value) ? '—' : String(value)
}

export function conditionLabel(
  condition: Pick<RuleCondition, 'condition' | 'value'>,
  fieldType: FieldType | undefined,
  t: Translate,
): string {
  const op = condition.condition
  if (op === '$any') return '---'
  if (op === '$is_set') return '◉'
  if (op === '$is_null') return '∅'
  if (op === '$eq' && fieldType === 'boolean') return condition.value ? 'True' : 'False'

  const opLabel = OP_LABELS[op ?? ''] ?? op ?? '?'
  const brackets = BETWEEN_BRACKETS[op ?? '']
  const value = brackets
    ? `${brackets.left}${rangeLabel(condition.value, fieldType, t)}${brackets.right}`
    : valueLabel(condition.value, fieldType, t)
  return opLabel ? `${opLabel} ${value}` : value
}
