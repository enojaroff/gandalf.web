// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

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
    locales: [
      { code: 'en', file: 'en.json', name: 'English' },
      { code: 'uk', file: 'uk.json', name: 'Ukrainian' },
    ],
    defaultLocale: 'en',
    lazy: true,
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

  // Variables d'environnement exposées au client et au serveur
  runtimeConfig: {
    // Variable privée (server-side only) : URL du backend API
    apiEndpoint: process.env.API_ENDPOINT || 'https://api.gndf.io/',
    // Variables exposées au client (SPA mode : tout s'exécute dans le navigateur)
    public: {
      apiClientId: process.env.API_CLIENTID || '',
      apiClientSecret: process.env.API_CLIENTSECRET || '',
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
