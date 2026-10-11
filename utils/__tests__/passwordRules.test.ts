import { describe, expect, it } from 'vitest'
import { passwordProblem } from '~/utils/passwordRules'

describe('passwordProblem', () => {
  it('accepts 8 to 32 characters with an uppercase, a lowercase and a digit', () => {
    expect(passwordProblem('Abcdefg1')).toBeNull()
    expect(passwordProblem('A1' + 'b'.repeat(30))).toBeNull()
  })

  it('names the first rule broken', () => {
    expect(passwordProblem('Abc1')).toBe('auth.passwordTooShort')
    expect(passwordProblem('A1' + 'b'.repeat(31))).toBe('auth.passwordTooLong')
    expect(passwordProblem('Abcd efg1')).toBe('auth.passwordSpaces')
    expect(passwordProblem('abcdefg1')).toBe('auth.passwordClasses')
    expect(passwordProblem('ABCDEFG1')).toBe('auth.passwordClasses')
    expect(passwordProblem('Abcdefgh')).toBe('auth.passwordClasses')
  })
})
