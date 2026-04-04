import { VALID_LOCALES, LOCALE_STORAGE_KEY, DETECT_BROWSER_LANGUAGE, DEFAULT_LOCALE } from '~/utils/locale'
import type { AppLocale } from '~/utils/locale'
import type { Ref } from 'vue'

export default defineNuxtPlugin((nuxtApp) => {
  const i18n = nuxtApp.$i18n as {
    locale: Ref<string>
    setLocale: (locale: AppLocale) => Promise<void>
  }

  function resolveLocale(): AppLocale {
    // 1. localStorage
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as AppLocale | null
    if (saved && VALID_LOCALES.includes(saved)) return saved

    // 2. Langue du navigateur (si activée)
    if (DETECT_BROWSER_LANGUAGE) {
      const browser = navigator.language.split('-')[0] as AppLocale
      if (VALID_LOCALES.includes(browser)) return browser
    }

    // 3. Constante applicative
    return DEFAULT_LOCALE
  }

  function applyLocale() {
    const resolved = resolveLocale()
    if (resolved !== i18n.locale.value) i18n.setLocale(resolved)
  }

  // Au démarrage
  applyLocale()

  // Après chaque navigation (évite que @nuxtjs/i18n réinitialise la locale)
  nuxtApp.hook('page:finish', applyLocale)
})
