// Compatibilité de types d'un fil de flow (DRG) — miroir de
// FlowRepository::typesCompatible (API) : un fil n'est valide que si ses deux
// extrémités sont de la même famille de types.
import type { DecisionTable } from '~/types/decision-table'

export type TypeFamily = 'text' | 'numeric' | 'boolean' | 'date'

// string et alpha_num forment une seule famille ; json (ou un type inconnu)
// n'est jamais branchable.
export function typeFamily(type: string | null | undefined): TypeFamily | null {
  switch ((type ?? '').toLowerCase()) {
    case 'string':
    case 'alpha_num':
      return 'text'
    case 'numeric':
    case 'number':
    case 'integer':
      return 'numeric'
    case 'boolean':
    case 'bool':
      return 'boolean'
    case 'date':
      return 'date'
    default:
      return null
  }
}

export function typesCompatible(sourceType: string | null | undefined, targetType: string | null | undefined): boolean {
  const source = typeFamily(sourceType)
  return source !== null && source === typeFamily(targetType)
}

// Type de la sortie final_decision d'une table : numérique en scoring, sinon
// son decision_type (cf. FlowRepository::tableOutputType).
export function tableOutputType(table: Pick<DecisionTable, 'matching_type' | 'decision_type'>): string {
  return table.matching_type !== 'first' ? 'numeric' : (table.decision_type || 'string')
}
