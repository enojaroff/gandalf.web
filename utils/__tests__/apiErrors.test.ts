import { describe, expect, it } from 'vitest'
import { apiErrorCode, apiErrorMessage, apiErrorText, apiMissingScopes, apiValidationMessages } from '~/utils/apiErrors'

// FetchError d'ofetch : le corps de la réponse est dans `data`
const fetchError = (body: unknown) => Object.assign(new Error('422'), { data: body })

describe('apiErrorMessage', () => {
  it('lit le message enveloppé dans data', () => {
    const e = fetchError({ meta: { code: 403 }, data: { message: 'Only a project admin can copy or move tables and flows.' } })
    expect(apiErrorMessage(e)).toBe('Only a project admin can copy or move tables and flows.')
    expect(apiErrorMessage(new Error('network'))).toBeNull()
  })
})

describe('apiValidationMessages', () => {
  it('aplatit les erreurs de validation Lumen par champ', () => {
    const e = fetchError({
      meta: { code: 422, error: 'validation', error_message: 'Validation failed' },
      data: {
        'variants.0.default_decision': ['The variants.0.default decision field is required.'],
        'variants.0.rules.0.than': ['The variants.0.rules.0.than field is required.'],
      },
    })
    expect(apiValidationMessages(e)).toEqual([
      'The variants.0.default decision field is required.',
      'The variants.0.rules.0.than field is required.',
    ])
  })

  it('lit la liste des erreurs d\'un flow sans reprendre flow_run_id', () => {
    const e = fetchError({ meta: { code: 422 }, data: { errors: ['Cycle detected.'], flow_run_id: 'abc' } })
    expect(apiValidationMessages(e)).toEqual(['Cycle detected.'])
  })

  it('renvoie une liste vide hors réponse de validation', () => {
    expect(apiValidationMessages(new Error('network'))).toEqual([])
    expect(apiValidationMessages(fetchError({ meta: { code: 500 } }))).toEqual([])
  })
})

describe('apiErrorCode', () => {
  it('lit le code et le message de meta', () => {
    const e = fetchError({ meta: { code: 409, error: 'version_in_use', error_message: 'This version is in use' }, data: [] })
    expect(apiErrorCode(e)).toEqual({ code: 'version_in_use', message: 'This version is in use' })
    expect(apiErrorCode(new Error('network'))).toEqual({ code: null, message: null })
  })
})

// Refus de l'ACL tel que le rend le Handler de l'API (pas de data)
const denied = (meta: Record<string, unknown>) =>
  Object.assign(new Error('403'), { data: { meta: { code: 403, error: 'access_denied', ...meta } } })

const t = (key: string, params?: Record<string, unknown>) => (params ? `${key}:${params.scopes}` : `<${key}>`)

describe('apiMissingScopes', () => {
  it('lit les droits manquants d\'un refus de l\'ACL', () => {
    expect(apiMissingScopes(denied({ error_message: 'Bad Scopes', scopes: ['tables_create', 'tables_update'] })))
      .toEqual(['tables_create', 'tables_update'])
  })

  it('renvoie une liste vide hors refus de l\'ACL', () => {
    expect(apiMissingScopes(new Error('network'))).toEqual([])
    expect(apiMissingScopes(Object.assign(new Error('422'), { data: { meta: { code: 422, scopes: ['x'] } } }))).toEqual([])
    expect(apiMissingScopes(null)).toEqual([])
  })
})

describe('apiErrorText', () => {
  it('nomme les droits manquants par leurs libellés', () => {
    const e = denied({ error_message: 'Bad Scopes', scopes: ['tables_update', 'tables_create', 'legacy_scope'] })
    expect(apiErrorText(e, t, 'repli')).toBe('errors.missingScopes:<scopes.badge.tables_create>, <scopes.badge.tables_update>, legacy_scope')
  })

  it('sinon le message du refus ou de l\'API, sinon le message de repli', () => {
    expect(apiErrorText(denied({ error_message: 'You are not a member of this application.', scopes: [] }), t, 'repli'))
      .toBe('You are not a member of this application.')
    expect(apiErrorText(Object.assign(new Error('403'), { data: { meta: { code: 403 }, data: { message: 'Only a project admin can copy or move tables and flows.' } } }), t, 'repli'))
      .toBe('Only a project admin can copy or move tables and flows.')
    expect(apiErrorText(new Error('network'), t, 'errors.operationFailed')).toBe('<errors.operationFailed>')
  })
})
