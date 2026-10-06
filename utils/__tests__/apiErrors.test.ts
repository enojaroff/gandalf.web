import { describe, expect, it } from 'vitest'
import { apiValidationMessages } from '~/utils/apiErrors'

// FetchError d'ofetch : le corps de la réponse est dans `data`
const fetchError = (body: unknown) => Object.assign(new Error('422'), { data: body })

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
