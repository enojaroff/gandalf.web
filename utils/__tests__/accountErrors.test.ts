import { describe, expect, it } from 'vitest'
import { accountErrorText } from '~/utils/accountErrors'

const t = (key: string) => `<${key}>`
const validation = (data: Record<string, string[]>) => ({ data: { meta: { code: 422, error: 'validation' }, data } })

describe('accountErrorText', () => {
  it('explique les refus connus de l\'API', () => {
    expect(accountErrorText(validation({ scope: ['validation.required_scopes'] }), t, 'errors.failedToSave')).toBe('<settings.viewRequired>')
    expect(accountErrorText(validation({ scope: ['The scope field is required.'] }), t, 'errors.failedToSave')).toBe('<settings.viewRequired>')
    expect(accountErrorText(validation({ role: ['The selected role is invalid.'] }), t, 'errors.failedToSave')).toBe('<settings.adminRoleRefused>')
  })

  it('ne répète pas un même message et garde les messages inconnus', () => {
    const e = validation({ scope: ['The scope field is required.', 'validation.required_scopes'], user_id: ['The user id field is required.'] })
    expect(accountErrorText(e, t, 'errors.failedToSave')).toBe('<settings.viewRequired> The user id field is required.')
  })

  it('sinon le message simple ou celui du code d\'erreur, sinon le message par défaut', () => {
    expect(accountErrorText({ data: { meta: {}, data: { message: 'You cannot delete your own account.' } } }, t, 'errors.failedToSave')).toBe('You cannot delete your own account.')
    expect(accountErrorText({ data: { meta: { error: 'access_denied', error_message: 'Only a project admin can invite an admin.' } } }, t, 'errors.failedToSave')).toBe('Only a project admin can invite an admin.')
    expect(accountErrorText(new Error('network'), t, 'settings.invitationFailed')).toBe('<settings.invitationFailed>')
  })

  it('traduit les refus de la création directe d\'un compte', () => {
    const e = validation({
      email: ['The email has already been taken.', 'The temporary email has already been taken.'],
      username: ['validation.username'],
    })
    expect(accountErrorText(e, t, 'settings.createAccountFailed')).toBe('<settings.accountExists> <settings.usernameInvalid>')
  })
})
