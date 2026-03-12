import type { DecisionRule, RuleCondition } from './decision-table'

export interface HistoryTable {
  _id: string
  table_id: string
  title: string
  created_at: string
  request: Record<string, unknown>
  rules: HistoryRule[]
}

export interface HistoryRule extends DecisionRule {
  is_matched: boolean
  conditions: HistoryRuleCondition[]
}

export interface HistoryRuleCondition extends RuleCondition {
  is_matched: boolean
  resolved_value?: unknown
}
