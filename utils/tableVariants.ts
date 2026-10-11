// Opérations sur les variantes d'une table, appliquées côté client avant
// d'enregistrer le contenu entier d'un brouillon : l'API remplace l'ensemble
// des variantes (setVariants).
import type { DecisionRule, DecisionVariant, RuleCondition } from '~/types/decision-table'

// Actions proposées sur une variante (VariantModal, page d'info)
export type VariantMode = 'copy' | 'edit' | 'delete'

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
  const { _id: _variantId, rules, ...variant } = source
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

// Retire une variante. En mode percent, sa probabilité revient à la première
// variante restante pour que la somme reste à 100 ; dans les autres modes, la
// somme n'est pas contrainte et chaque probabilité doit rester entre 0 et 100
// (l'API refuse 120) : rien n'est reporté. Une table garde au moins une
// variante : retirer la dernière ne change rien.
export function removeVariant<V extends { _id?: string; probability: number }>(
  variants: V[],
  variantId: string,
  // variants_probability : 'first', 'random' ou 'percent'
  mode: string | null | undefined,
): V[] {
  const removed = variants.find(v => v._id === variantId)
  const [first, ...others] = variants.filter(v => v._id !== variantId)
  if (!removed || !first) return variants
  if (mode !== 'percent') return [first, ...others]
  return [{ ...first, probability: (first.probability ?? 0) + (removed.probability ?? 0) }, ...others]
}

// Longueur comptée comme l'API (mb_strlen, règle between) : en points de code,
// pas en unités UTF-16 comme String.length (un emoji compte pour 1, pas 2).
export function characterCount(text: string): number {
  return Array.from(text).length
}
