// Règles d'un mot de passe choisi par la personne, celles de l'API
// (UserValidator) avec une longueur minimale de 8 comme à l'inscription.
// Renvoie la clé i18n du premier manquement, ou null.
export type PasswordProblem = 'auth.passwordTooShort' | 'auth.passwordTooLong' | 'auth.passwordSpaces' | 'auth.passwordClasses'

export function passwordProblem(password: string): PasswordProblem | null {
  if (password.length < 8) return 'auth.passwordTooShort'
  if (password.length > 32) return 'auth.passwordTooLong'
  if (/\s/.test(password)) return 'auth.passwordSpaces'
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) return 'auth.passwordClasses'
  return null
}
