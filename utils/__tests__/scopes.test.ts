import { describe, expect, it } from 'vitest'
import { PROJECT_CONSUMER_SCOPES, PROJECT_USER_SCOPES, PROJECT_USER_SCOPE_GROUPS, consumerScopeBadges, consumerScopeLabelKey, scopeGroupTitleKey, userScopeBadges, userScopeLabelKey } from '~/utils/scopes'
import fr from '~/locales/fr.json'
import en from '~/locales/en.json'
import es from '~/locales/es.json'
import it_ from '~/locales/it.json'
import bg from '~/locales/bg.json'
import uk from '~/locales/uk.json'

const locales: Record<string, unknown> = { fr, en, es, it: it_, bg, uk }

function lookup(messages: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages)
}

describe('libellés des droits', () => {
  it('chaque droit de membre est dans un groupe, une seule fois', () => {
    const grouped = PROJECT_USER_SCOPE_GROUPS.flatMap(group => group.scopes.map(scope => scope.key))
    expect([...grouped].sort()).toEqual([...PROJECT_USER_SCOPES].sort())
  })

  it.each(Object.keys(locales))('tous traduits en %s', (lang) => {
    const keys = [
      ...PROJECT_USER_SCOPE_GROUPS.map(scopeGroupTitleKey),
      ...PROJECT_USER_SCOPES.map(userScopeLabelKey),
      ...PROJECT_CONSUMER_SCOPES.map(consumerScopeLabelKey),
      ...userScopeBadges(PROJECT_USER_SCOPES).map(badge => badge.labelKey as string),
    ]
    const missing = keys.filter(key => typeof lookup(locales[lang], key) !== 'string')
    expect(missing).toEqual([])
  })

  it('en français, plus aucun libellé anglais', () => {
    expect(lookup(fr, 'scopes.user.tables_view')).toBe('Voir')
    expect(lookup(fr, 'scopes.groups.tables')).toBe('Tables de décision')
  })
})

describe('badges des listes', () => {
  it('droits d\'un membre dans l\'ordre des fenêtres, un droit inconnu par sa clé', () => {
    expect(userScopeBadges(['users_manage', 'legacy_scope', 'tables_view', 'project_update'])).toEqual([
      { key: 'project_update', labelKey: 'scopes.badge.project_update' },
      { key: 'tables_view', labelKey: 'scopes.badge.tables_view' },
      { key: 'users_manage', labelKey: 'scopes.badge.users_manage' },
      { key: 'legacy_scope', labelKey: null },
    ])
    expect(userScopeBadges(undefined)).toEqual([])
  })

  it('droits d\'une clé d\'API', () => {
    expect(consumerScopeBadges(['decisions_make', 'decisions_view'])).toEqual([
      { key: 'decisions_view', labelKey: 'scopes.consumer.decisions_view' },
      { key: 'decisions_make', labelKey: 'scopes.consumer.decisions_make' },
    ])
  })

  it('en français', () => {
    expect(lookup(fr, 'scopes.badge.tables_view')).toBe('Tables : voir')
  })
})
