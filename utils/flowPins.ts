// Versions de table figées par les nœuds d'un flow (gandalf.api, VERSIONS.md) :
// règles pures de l'éditeur de flows, testées.
import type { DecisionField, DecisionTable } from '~/types/decision-table'
import type { FlowNode } from '~/types/flow'

export type PinStatus = 'active' | 'outdated' | 'unpinned'

/**
 * Où en est la version figée d'un nœud : la version active de sa table, une
 * autre (le flow n'exécute pas la version active), ou aucune (l'API prendra la
 * version active à l'enregistrement).
 */
export function pinStatusOf(node: Pick<FlowNode, 'table_version_id'>, activeVersionId: string | null): PinStatus {
  if (!node.table_version_id) return 'unpinned'
  return node.table_version_id === activeVersionId ? 'active' : 'outdated'
}

/**
 * Les tables telles que le canvas doit les afficher : les champs d'une table
 * sont ceux de la version figée par ses nœuds, quand ils sont chargés (la table
 * elle-même porte ceux de sa version active). Deux nœuds d'une même table figés
 * sur des versions différentes : la première version chargée l'emporte.
 */
export function tablesForPins(
  tables: DecisionTable[],
  nodes: Pick<FlowNode, 'table_id' | 'table_version_id'>[],
  pinnedFields: Record<string, DecisionField[]>,
): DecisionTable[] {
  const fieldsByTable = new Map<string, DecisionField[]>()
  for (const node of nodes) {
    const fields = node.table_version_id ? pinnedFields[node.table_version_id] : undefined
    if (fields && !fieldsByTable.has(node.table_id)) fieldsByTable.set(node.table_id, fields)
  }
  return tables.map(table => (fieldsByTable.has(table._id) ? { ...table, fields: fieldsByTable.get(table._id)! } : table))
}
