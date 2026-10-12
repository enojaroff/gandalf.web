import { describe, expect, it } from 'vitest'
import { temporaryPasswordOf } from '~/utils/temporaryPassword'

describe('temporaryPasswordOf', () => {
  it('reprend le résultat de l\'API, le titre restant une clé', () => {
    expect(temporaryPasswordOf('settings.accountCreated', {
      username: 'new.user', email: 'new@example.test', temporary_password: 'Fbb2QQTzvWsU', email_sent: true,
    })).toEqual({
      titleKey: 'settings.accountCreated', username: 'new.user', email: 'new@example.test', password: 'Fbb2QQTzvWsU', emailSent: true,
    })
  })

  it('sans nom d\'utilisateur, l\'adresse ; sans email_sent, pas d\'e-mail', () => {
    expect(temporaryPasswordOf('settings.tempPasswordTitle', { email: 'a@example.test', temporary_password: 'x' }))
      .toMatchObject({ username: 'a@example.test', emailSent: false })
  })
})
