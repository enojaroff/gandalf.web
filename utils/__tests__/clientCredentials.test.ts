import { describe, expect, it } from 'vitest'
import { clientAuthorization, needsClientCredentials } from '~/utils/clientCredentials'

describe('needsClientCredentials', () => {
  it('reconnaît les routes du client OAuth', () => {
    expect(needsClientCredentials('POST', 'v1/oauth')).toBe(true)
    expect(needsClientCredentials('post', '/v1/oauth/')).toBe(true)
    expect(needsClientCredentials('PUT', 'v1/users/password/reset')).toBe(true)
    expect(needsClientCredentials('GET', 'v1/users/username')).toBe(true)
  })

  it('laisse les autres routes, même chemin avec une autre méthode', () => {
    expect(needsClientCredentials('GET', 'v1/users')).toBe(false)
    expect(needsClientCredentials('PUT', 'v1/users/current')).toBe(false)
    expect(needsClientCredentials('POST', 'v2/tables/abc/decisions')).toBe(false)
    expect(needsClientCredentials('DELETE', 'v1/oauth')).toBe(false)
  })
})

describe('clientAuthorization', () => {
  it('construit l\'en-tête Basic', () => {
    expect(clientAuthorization('id', 'secret')).toBe(`Basic ${Buffer.from('id:secret').toString('base64')}`)
  })
})
