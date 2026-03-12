export interface AnalyticsTable {
  table_id: string
  total_decisions: number
  variants: AnalyticsVariant[]
  period?: {
    from: string
    to: string
  }
}

export interface AnalyticsVariant {
  variant_id: string
  title: string
  total: number
  rules: AnalyticsRule[]
}

export interface AnalyticsRule {
  rule_id: string
  title?: string
  matched: number
  conditions: AnalyticsRuleCondition[]
}

export interface AnalyticsRuleCondition {
  field_key: string
  matched: number
}
