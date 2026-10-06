import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Tests unitaires des utilitaires purs (sans Nuxt) : seul l'alias `~` est requis.
export default defineConfig({
  resolve: {
    alias: { '~': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    include: ['utils/__tests__/**/*.test.ts'],
  },
})
