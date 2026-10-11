import { apiErrorCode, apiErrorMessage, apiValidationMessages } from '~/utils/apiErrors'

// Droit sans lequel un membre ne voit rien de l'application ; l'API l'exige à
// l'ajout et à la modification d'un membre (required_scopes).
export const REQUIRED_MEMBER_SCOPE = 'tables_view'

// Messages de validation de l'API sur les membres, et la clé i18n qui les
// explique à l'utilisateur.
const KNOWN_MESSAGES: Record<string, string> = {
  'validation.required_scopes': 'settings.viewRequired',
  'The scope field is required.': 'settings.viewRequired',
  'The selected role is invalid.': 'settings.adminRoleRefused',
  // Création directe d'un compte
  'The email has already been taken.': 'settings.accountExists',
  'The temporary email has already been taken.': 'settings.accountExists',
  'The username has already been taken.': 'settings.usernameTaken',
  'validation.username': 'settings.usernameInvalid',
  'The username must be between 2 and 32 characters.': 'settings.usernameInvalid',
}

// Texte d'une erreur de l'API sur un membre (ajout, invitation, modification,
// retrait) : les refus connus en clair, sinon le message de l'API, sinon le
// message par défaut.
export function accountErrorText(e: unknown, t: (key: string) => string, fallbackKey: string): string {
  const validation = apiValidationMessages(e)
  if (validation.length) {
    const texts = validation.map(message => (KNOWN_MESSAGES[message] ? t(KNOWN_MESSAGES[message]) : message))
    return [...new Set(texts)].join(' ')
  }
  return apiErrorMessage(e) || apiErrorCode(e).message || t(fallbackKey)
}
