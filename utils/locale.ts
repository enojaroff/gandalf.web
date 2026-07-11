export const VALID_LOCALES = ['fr', 'en', 'uk', 'bg', 'it', 'es'] as const
export type AppLocale = typeof VALID_LOCALES[number]

export const LOCALE_STORAGE_KEY = 'locale'

/** Si true, la langue du navigateur est utilisée quand aucune locale n'est sauvegardée */
export const DETECT_BROWSER_LANGUAGE = true

/** Langue par défaut si la détection navigateur est désactivée ou sans résultat */
export const DEFAULT_LOCALE: AppLocale = 'fr'
