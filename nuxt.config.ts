// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  // SPA mode : dashboard d'administration, SSR non nécessaire
  ssr: false,

  modules: [
    '@nuxt/ui',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@vueuse/nuxt',
  ],

  // Nuxt UI - Tailwind CSS intégré
  ui: {
    colorMode: false,
  },

  // i18n
  i18n: {
    vueI18n: './i18n.config.ts',
    // L'ordre dans le tableau correspond à l'ordre d'affichage dans le sélecteur
    locales: [
      { code: 'fr', file: 'fr.json', name: 'Français' },
      { code: 'en', file: 'en.json', name: 'English' },
      { code: 'it', file: 'it.json', name: 'Italiano' },
      { code: 'es', file: 'es.json', name: 'Español' },
      { code: 'uk', file: 'uk.json', name: 'Ukrainian' },
      { code: 'bg', file: 'bg.json', name: 'Български' },
    ],
    defaultLocale: 'en',
    detectBrowserLanguage: false,
    langDir: 'locales',
    restructureDir: false,
    bundle: {
      optimizeTranslationDirective: false,
    },
  },

  // Pinia persistence
  pinia: {
    storesDirs: ['./stores/**'],
  },

  // Variables d'environnement. Au démarrage d'un build, NUXT_API_ENDPOINT,
  // NUXT_API_CLIENT_ID et NUXT_API_CLIENT_SECRET les remplacent.
  runtimeConfig: {
    // Serveur seulement : URL du backend API, et client OAuth que le proxy /api
    // ajoute aux routes qui l'exigent (utils/clientCredentials.ts)
    apiEndpoint: process.env.API_ENDPOINT || 'https://api.gndf.io/',
    apiClientId: process.env.API_CLIENTID || '',
    apiClientSecret: process.env.API_CLIENTSECRET || '',
    // Exposé au navigateur
    public: {
      apiProxyPath: '/api',
    },
  },

  // CSS global : Tailwind CSS v4 + styles custom SCSS
  css: ['~/assets/css/main.css', '~/assets/scss/main.scss'],

  // Routage
  router: {
    options: {
      strict: false,
    },
  },

  // Nitro server config
  nitro: {},

  typescript: {
    strict: true,
    shim: false,
  },
})
