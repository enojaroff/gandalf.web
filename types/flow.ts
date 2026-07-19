// Types du Decision Requirement Graph (DRG) — un « Flow » compose plusieurs
// tables de décision en un graphe : la sortie d'une table alimente un champ
// d'entrée d'une autre. Miroir du backend (voir DRG.md côté API).

// Type d'une entrée/sortie de flow. Aligné sur FieldType côté table.
export type FlowIOType = 'numeric' | 'boolean' | 'string'

// Discriminant de l'enveloppe de réponse unifiée. Une table renvoie
// table_simple / table_advanced ; un flow renvoie drg.
export type DecisionKind = 'table_simple' | 'table_advanced' | 'drg'

// Canvas position, in flow coordinates. Persisted on inputs, outputs and nodes
// so the layout the user arranges is restored on reopen. The backend stores it
// verbatim (MongoDB, no per-field whitelist) and ignores it at execution.
export interface CanvasPosition {
  x: number
  y: number
}

// Contrat d'entrée public du flow.
export interface FlowInput {
  key: string
  type: FlowIOType
  position?: CanvasPosition
}

// Contrat de sortie public du flow. Chaque sortie nomme la sortie d'un nœud
// (aujourd'hui from_output vaut toujours 'final_decision').
export interface FlowOutput {
  name: string
  from_node: string
  from_output: string
  position?: CanvasPosition
}

// Un nœud : référence une table de décision par son id.
export interface FlowNode {
  node_id: string
  table_id: string
  // Optional display name shown in the canvas node header. Useful when the same
  // table is used by several nodes. The backend stores it but ignores it.
  label?: string
  position?: CanvasPosition
}

// Source d'une arête : soit une entrée de flow ({ input }), soit la sortie
// d'un nœud amont ({ node, output }).
export interface FlowEdgeFrom {
  input?: string
  node?: string
  output?: string
}

// Cible d'une arête : un champ d'un nœud aval.
export interface FlowEdgeInto {
  node: string
  field: string
}

// Une arête câble une valeur de `from` vers `into`.
export interface FlowEdge {
  from: FlowEdgeFrom
  into: FlowEdgeInto
}

// Un flow (DRG).
export interface Flow {
  _id: string
  title: string
  description?: string
  // Référence optionnelle à une catégorie de l'application (pastille en liste).
  category_id?: string | null
  inputs: FlowInput[]
  outputs: FlowOutput[]
  nodes: FlowNode[]
  edges: FlowEdge[]
}

// Trace d'un nœud lors d'une exécution.
export interface FlowRunNode {
  node_id: string
  table_id: string
  input: Record<string, unknown>
  decision_id: string | null
  answer: Record<string, unknown> | null
}

// Une exécution enregistrée (collection flow_runs).
export interface FlowRun {
  _id: string
  flow: { _id: string; title: string }
  application?: string
  inputs: Record<string, unknown>
  answer: Record<string, unknown>
  nodes: FlowRunNode[]
  error: { errors: string[] } | null
  created_at?: string
  updated_at?: string
}

// Résultat renvoyé par POST /flows/{id}/decisions.
export interface FlowResult {
  flow_run_id: string
  answer: Record<string, unknown>
  answer_types: Record<string, string>
  decision_kind: DecisionKind
  nodes: FlowRunNode[]
}

// Réponse 422 de validation de graphe / d'exécution.
export interface FlowValidationError {
  errors: string[]
  flow_run_id?: string
}
