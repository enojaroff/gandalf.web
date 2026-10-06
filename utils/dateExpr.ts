// Grammaire des valeurs d'un champ `date` — miroir de App\Services\DateValue (API).
//
// - Date absolue : ISO "AAAA-MM-JJ", éventuellement suivie d'une heure
//   ("2026-03-15T10:30:00+02:00") ignorée : seul le jour compte.
// - Date relative (conditions uniquement) : "today", "today-30d", "today+1y"
//   (unités d jours, w semaines, m mois, y ans).
// Les conditions comparent des jours calendaires.

export type DateUnit = 'd' | 'w' | 'm' | 'y'

export interface RelativeDate {
  offset: number
  unit: DateUnit
}

export const DATE_UNITS: DateUnit[] = ['d', 'w', 'm', 'y']

// Opérateurs acceptés par l'API sur un champ date
export const DATE_OPERATORS = [
  '$any', '$is_set', '$is_null',
  '$eq', '$ne', '$gt', '$gte', '$lt', '$lte',
  '$between', '$between_excl', '$between_lexcl', '$between_rexcl', '$not_between',
]

export const DATE_RANGE_OPERATORS = ['$between', '$between_excl', '$between_lexcl', '$between_rexcl', '$not_between']

const VALUELESS_OPERATORS = ['$any', '$is_set', '$is_null']

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d)?)?$/i
const RELATIVE_RE = /^today(?:\s*([+-])\s*(\d{1,4})\s*([dwmy]))?$/i

const DAY_MS = 86_400_000

// Jour calendaire d'une date ISO, sous forme de numéro de jour (depuis 1970-01-01)
function isoDayNumber(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const m = ISO_RE.exec(value.trim())
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const time = Date.UTC(y, mo - 1, d)
  const check = new Date(time)
  // Rejette les dates impossibles (2026-02-30…)
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null
  return time / DAY_MS
}

export function isIsoDate(value: unknown): boolean {
  return isoDayNumber(value) !== null
}

// "today" → { offset: 0, unit: 'd' } ; "today-30d" → { offset: -30, unit: 'd' }
export function parseRelative(value: unknown): RelativeDate | null {
  if (typeof value !== 'string') return null
  const m = RELATIVE_RE.exec(value.trim())
  if (!m) return null
  if (!m[1]) return { offset: 0, unit: 'd' }
  return { offset: Number(m[2]) * (m[1] === '-' ? -1 : 1), unit: m[3]!.toLowerCase() as DateUnit }
}

// Forme canonique d'une date relative : "today", "today-30d", "today+1y"
export function formatRelative({ offset, unit }: RelativeDate): string {
  if (!offset) return 'today'
  return `today${offset < 0 ? '-' : '+'}${Math.abs(offset)}${unit}`
}

// Calcul en mois calendaires, ramené à la fin du mois (31/03 − 1 mois = 28/02)
function addMonths(day: number, months: number): number {
  const date = new Date(day * DAY_MS)
  const index = date.getUTCFullYear() * 12 + date.getUTCMonth() + months
  const year = Math.floor(index / 12)
  const month = index - year * 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)) / DAY_MS
}

// Jour d'aujourd'hui (date locale du navigateur), en numéro de jour
function todayDayNumber(now: Date): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS
}

// Résout une date absolue ou relative en numéro de jour ; null si invalide
export function toDayNumber(value: unknown, now: Date = new Date()): number | null {
  const iso = isoDayNumber(value)
  if (iso !== null) return iso
  const rel = parseRelative(value)
  if (!rel) return null
  const today = todayDayNumber(now)
  switch (rel.unit) {
    case 'd': return today + rel.offset
    case 'w': return today + rel.offset * 7
    case 'm': return addMonths(today, rel.offset)
    case 'y': return addMonths(today, rel.offset * 12)
  }
}

export function isDateExpr(value: unknown): boolean {
  return toDayNumber(value) !== null
}

export function dayNumberToIso(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10)
}

// Date du jour au format ISO (AAAA-MM-JJ), selon l'heure locale
export function todayIso(now: Date = new Date()): string {
  return dayNumberToIso(todayDayNumber(now))
}

// Libellé court pour l'affichage : "2026-03-15", "auj. − 30 j"
export function dateExprLabel(value: unknown, t: (key: string) => string): string {
  const rel = parseRelative(value)
  if (rel) {
    if (!rel.offset) return t('dates.short.today')
    return `${t('dates.short.today')} ${rel.offset < 0 ? '−' : '+'} ${Math.abs(rel.offset)} ${t(`dates.short.${rel.unit}`)}`
  }
  if (typeof value === 'string' && isIsoDate(value)) return value.trim().slice(0, 10)
  return value === null || value === undefined || value === '' ? '—' : String(value)
}

// Même règle que l'API : opérateur permis et valeur conforme ; les bornes d'un
// intervalle doivent être dans l'ordre strict.
export function isValidDateCondition(operator: string | null | undefined, value: unknown, now: Date = new Date()): boolean {
  if (!operator || !DATE_OPERATORS.includes(operator)) return false
  if (VALUELESS_OPERATORS.includes(operator)) return true
  if (DATE_RANGE_OPERATORS.includes(operator)) {
    if (typeof value !== 'string') return false
    const bounds = value.split(';')
    if (bounds.length !== 2) return false
    const [min, max] = bounds.map(b => toDayNumber(b, now))
    return min != null && max != null && min < max
  }
  return toDayNumber(value, now) !== null
}
