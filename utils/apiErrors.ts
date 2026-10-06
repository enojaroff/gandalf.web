// Messages d'une réponse 422 de l'API (FetchError.data porte le corps de la réponse) :
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
