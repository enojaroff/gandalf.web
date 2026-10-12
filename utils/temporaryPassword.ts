// Mot de passe temporaire à montrer une seule fois (TemporaryPasswordModal) :
// après la confirmation d'une invitation, la création d'un compte ou une
// réinitialisation. Le titre reste une clé i18n, traduite à l'affichage.
export interface TemporaryPassword {
  titleKey: string
  username: string
  email: string
  password: string
  emailSent: boolean
}

export function temporaryPasswordOf(
  titleKey: string,
  result: { username?: string; email: string; temporary_password: string; email_sent?: boolean },
): TemporaryPassword {
  return {
    titleKey,
    // La personne se connecte aussi avec son adresse, à défaut de nom
    username: result.username || result.email,
    email: result.email,
    password: result.temporary_password,
    emailSent: result.email_sent === true,
  }
}
