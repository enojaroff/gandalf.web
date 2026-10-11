// Opérations sur les variantes d'une table, appliquées côté client avant
// d'enregistrer la table entière : l'API remplace l'ensemble des variantes
// (Table::setVariants) et y gère seule la variante par défaut.
import type { DecisionRule, DecisionVariant, RuleCondition } from '~/types/decision-table'

export interface VariantInfo {
  title: string
  description: string
}

// Variante pas encore enregistrée : l'API attribue les _id manquants (variante,
// règles, conditions).
export type NewVariant = Omit<DecisionVariant, '_id' | 'rules'> & {
  rules: (Omit<DecisionRule, '_id' | 'conditions'> & { conditions: Omit<RuleCondition, '_id'>[] })[]
}

// Nouvelle variante reprenant les règles de `source`, sous de nouveaux _id
// (deux variantes ne partagent pas de règles, par ex. pour les analytics).
// Probabilité 0 : la somme reste à 100 en mode percent (probabilitySum).
export function copyVariant(source: DecisionVariant, info: VariantInfo): NewVariant {
  const { _id: _variantId, is_default: _default, rules, ...variant } = source
  return {
    ...variant,
    title: info.title,
    description: info.description,
    probability: 0,
    rules: rules
      .filter(rule => !rule.isDeleted)
      .map(({ _id: _ruleId, isDeleted: _deleted, conditions, ...rule }) => ({
        ...rule,
        conditions: conditions.map(({ _id: _conditionId, ...condition }) => condition),
      })),
  }
}

// Retire une variante ; sa probabilité revient à la première variante restante
// pour que la somme reste à 100 en mode percent. Une table garde au moins une
// variante : retirer la dernière ne change rien.
export function removeVariant<V extends { _id?: string; probability: number }>(variants: V[], variantId: string): V[] {
  const removed = variants.find(v => v._id === variantId)
  const [first, ...others] = variants.filter(v => v._id !== variantId)
  if (!removed || !first) return variants
  return [{ ...first, probability: (first.probability ?? 0) + (removed.probability ?? 0) }, ...others]
}
