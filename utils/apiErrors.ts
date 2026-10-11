// Lecture des erreurs de l'API. FetchError.data porte le corps de la réponse,
// toujours enveloppé : { meta, data }.
import { userScopeBadges } from '~/utils/scopes'

// Message simple, { meta, data: { message } } (ex. CopyMoveGuard).
export function apiErrorMessage(e: unknown): string | null {
  const body = (e as { data?: { message?: string; data?: { message?: string } } })?.data
  return body?.data?.message || body?.message || null
}

// Messages d'une réponse 422 :
// - validation Lumen : { meta, data: { "<champ>": ["message", …] } }
// - flows (DRG)      : { meta, data: { errors: ["message", …], flow_run_id? } }
export function apiValidationMessages(e: unknown): string[] {
  const body = (e as { data?: { data?: unknown } })?.data?.data
  if (!body || typeof body !== 'object') return []
  const isString = (m: unknown): m is string => typeof m === 'string'
  const { errors } = body as { errors?: unknown }
  if (Array.isArray(errors)) return errors.filter(isString)
  return Object.values(body).filter(Array.isArray).flat().filter(isString)
}

// Code et message d'une erreur de l'API rendue par le Handler :
// { meta: { code, error: 'version_in_use', error_message }, data }.
export function apiErrorCode(e: unknown): { code: string | null; message: string | null } {
  const meta = (e as { data?: { meta?: { error?: string; error_message?: string } } })?.data?.meta
  return { code: meta?.error ?? null, message: meta?.error_message ?? null }
}

// Droits manquants d'un refus de l'ACL (403), sinon liste vide :
// { meta: { error: 'access_denied', error_message: 'Bad Scopes', scopes: [...] } }.
export function apiMissingScopes(e: unknown): string[] {
  const meta = (e as { data?: { meta?: { error?: string; scopes?: unknown } } } | null)?.data?.meta
  if (meta?.error !== 'access_denied' || !Array.isArray(meta.scopes)) return []
  return meta.scopes.filter((s): s is string => typeof s === 'string')
}

export type Translate = (key: string, params?: Record<string, unknown>) => string

// Message d'un échec : les droits manquants (libellés des badges), sinon le
// message de l'API (un refus sans droit manquant inclus), sinon le message de
// repli (clé i18n).
export function apiErrorText(e: unknown, t: Translate, fallbackKey: string): string {
  const scopes = apiMissingScopes(e)
  if (scopes.length) {
    const names = userScopeBadges(scopes).map(badge => (badge.labelKey ? t(badge.labelKey) : badge.key))
    return t('errors.missingScopes', { scopes: names.join(', ') })
  }
  const { code, message } = apiErrorCode(e)
  return apiErrorMessage(e) || (code === 'access_denied' && message ? message : null) || t(fallbackKey)
}
