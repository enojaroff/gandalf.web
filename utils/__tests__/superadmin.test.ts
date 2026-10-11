import { describe, expect, it } from 'vitest'
import { accountLocked, applicationAdmins, deleteConfirmation, logEntryLabel, logStatusColor } from '~/utils/superadmin'
import type { AdminAccount, AdminLogEntry } from '~/types/admin'

const entry = (patch: Partial<AdminLogEntry>): AdminLogEntry => ({
  _id: 'e1',
  user_id: 'u1',
  email: 'ops@claims-ia.fr',
  action: 'request',
  method: 'DELETE',
  path: '/api/v1/projects',
  application_id: 'a1',
  status: 200,
  details: {},
  created_at: '2026-10-11T09:30:00+00:00',
  ...patch,
})

describe('applicationAdmins', () => {
  it('liste les admins, e-mail ou nom à défaut', () => {
    expect(applicationAdmins({
      _id: 'a1',
      title: 'Alpha',
      users: [
        { user_id: 'u1', role: 'admin', scope: [], email: 'carol@example.test' },
        { user_id: 'u2', role: 'user', scope: [], email: 'dave@example.test' },
        { user_id: 'u3', role: 'admin', scope: [], username: 'eve' },
      ],
    })).toEqual(['carol@example.test', 'eve'])
  })

  it("renvoie une liste vide pour une application sans membres", () => {
    expect(applicationAdmins({ _id: 'a1', title: 'Alpha' })).toEqual([])
    expect(applicationAdmins({ _id: 'a1', title: 'Alpha', users: [] })).toEqual([])
  })
})

describe('logEntryLabel', () => {
  it('affiche la méthode et le chemin d\'une requête', () => {
    expect(logEntryLabel(entry({}))).toEqual({ text: 'DELETE /api/v1/projects' })
  })

  it('traduit une attribution ou un retrait du rôle', () => {
    expect(logEntryLabel(entry({ action: 'superadmin.grant', method: null, path: null, details: { email: 'x@claims-ia.fr' } })))
      .toEqual({ key: 'admin.logGrant', params: { email: 'x@claims-ia.fr' } })
    expect(logEntryLabel(entry({ action: 'superadmin.revoke', method: null, path: null, details: { user_id: 'u9' } })))
      .toEqual({ key: 'admin.logRevoke', params: { email: 'u9' } })
  })
})

describe('logStatusColor', () => {
  it('distingue succès, refus et erreur', () => {
    expect(logStatusColor(201)).toBe('success')
    expect(logStatusColor(403)).toBe('warning')
    expect(logStatusColor(500)).toBe('error')
    expect(logStatusColor(null)).toBe('neutral')
    expect(logStatusColor(undefined)).toBe('neutral')
  })
})

describe('logEntryLabel, actions sur les comptes', () => {
  const id = '0123456789abcdef01234567'

  it('nomme le compte supprimé, réinitialisé ou créé', () => {
    expect(logEntryLabel(entry({ method: 'DELETE', path: `/api/v1/superadmin/users/${id}`, details: { email: 'eve@example.test' } })))
      .toEqual({ key: 'admin.logAccountDeleted', params: { email: 'eve@example.test' } })
    expect(logEntryLabel(entry({ method: 'POST', path: `/api/v1/superadmin/users/${id}/password`, details: { username: 'eve' } })))
      .toEqual({ key: 'admin.logPasswordReset', params: { email: 'eve' } })
    expect(logEntryLabel(entry({ method: 'POST', path: '/api/v1/projects/collaborators/account', details: { email: 'new@example.test' } })))
      .toEqual({ key: 'admin.logAccountCreated', params: { email: 'new@example.test' } })
  })

  it('montre la requête quand le compte n\'est pas noté (requête refusée)', () => {
    expect(logEntryLabel(entry({ method: 'DELETE', path: `/api/v1/superadmin/users/${id}`, status: 403, details: {} })))
      .toEqual({ text: `DELETE /api/v1/superadmin/users/${id}` })
    expect(logEntryLabel(entry({ method: 'GET', path: '/api/v1/superadmin/users', details: {} })))
      .toEqual({ text: 'GET /api/v1/superadmin/users' })
  })
})

const account = (patch: Partial<AdminAccount>): AdminAccount => ({
  _id: 'a1',
  username: 'eve',
  email: 'eve@example.test',
  active: true,
  created_at: null,
  applications: [],
  ...patch,
})

describe('accountLocked', () => {
  it('protège son propre compte et ceux des superadmins', () => {
    expect(accountLocked(account({}), 'me')).toBe(false)
    expect(accountLocked(account({ _id: 'me' }), 'me')).toBe(true)
    expect(accountLocked(account({ superadmin: true }), 'me')).toBe(true)
  })
})

describe('deleteConfirmation', () => {
  it('demande l\'adresse, celle en attente, ou le nom d\'utilisateur', () => {
    expect(deleteConfirmation(account({}))).toBe('eve@example.test')
    expect(deleteConfirmation(account({ email: '', temporary_email: 'new@example.test' }))).toBe('new@example.test')
    expect(deleteConfirmation(account({ email: '', temporary_email: null }))).toBe('eve')
  })
})
