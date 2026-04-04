<template>
  <div class="app-layout">
    <!-- Navbar -->
    <header class="app-navbar">
      <UContainer class="flex items-center justify-between h-16">
        <!-- Logo -->
        <NuxtLink to="/tables" class="flex items-center gap-2">
          <img :src="logoUrl" alt="Gandalf" class="h-12 w-auto" />
        </NuxtLink>

        <!-- Sélecteur de projet + Navigation principale -->
        <div class="flex items-center gap-3">
          <!-- Sélecteur de projet -->
          <USelect v-if="projectsStore.projects.length > 0" :model-value="projectsStore.selectedProjectId ?? undefined"
            :items="projectItems" class="w-48" size="sm" @update:model-value="onProjectChange" />

          <!-- Navigation principale -->
          <nav class="hidden md:flex items-center gap-1">
            <UButton v-for="item in navItems" :key="item.to" :to="item.to" variant="ghost" :active="isActive(item.to)">
              {{ item.label }}
            </UButton>
          </nav>
        </div>

        <!-- Sélecteur de langue + Menu utilisateur -->
        <div class="flex items-center gap-2">
          <!-- Sélecteur de langue -->
          <UDropdownMenu :items="localeMenuItems">
            <UButton variant="ghost" size="sm" class="gap-1">
              <span class="text-2xl leading-none">{{ localeFlag }}</span>
              <UIcon name="i-heroicons-chevron-down" class="text-xs opacity-60" />
            </UButton>
          </UDropdownMenu>
          <UDropdownMenu :items="userMenuItems">
            <UButton variant="ghost" icon="i-heroicons-user-circle" size="sm">
              {{ userStore.currentUser?.username || 'Account' }}
            </UButton>
          </UDropdownMenu>
        </div>
      </UContainer>
    </header>

    <!-- Contenu principal -->
    <main class="app-content">
      <UContainer class="py-6">
        <slot />
      </UContainer>
    </main>

    <UFooter>
      <UContainer class="flex items-center justify-between h-16">
        <img src="~/assets/images/footer-logo.png" alt="Gandalf" class="h-12 w-auto" />
        <span class="">Claims IA</span>
      </UContainer>
    </UFooter>
  </div>

</template>

<script setup lang="ts">
import logoUrl from '~/assets/images/logo.svg'
import { LOCALE_STORAGE_KEY } from '~/utils/locale'
import type { AppLocale } from '~/utils/locale'

const { locale, locales, t, setLocale } = useI18n()
const flags: Record<string, string> = { fr: '🇫🇷', en: '🇬🇧', uk: '🇺🇦', bg: '🇧🇬', it: '🇮🇹', es: '🇪🇸' }

const localeFlag = computed(() => flags[locale.value] ?? locale.value)

function switchLocale(code: AppLocale) {
  setLocale(code)
  localStorage.setItem(LOCALE_STORAGE_KEY, code)
}

const localeMenuItems = computed(() =>
  (locales.value as Array<{ code: string; name: string }>).map(l => ({
    label: `${flags[l.code] ?? ''} ${l.name}`,
    onSelect: () => switchLocale(l.code as AppLocale),
  }))
)
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const userStore = useUserStore()

// Charger les projets et l'utilisateur si pas encore chargés
onMounted(async () => {
  if (authStore.isAuthenticated) {
    if (projectsStore.projects.length === 0) {
      await projectsStore.fetchAll()
    }
    if (!userStore.currentUser) {
      await userStore.fetchCurrent()
    }
  }
})


const navItems = computed(() => [
  { label: t('nav.tables'), to: '/tables' },
  { label: t('nav.groups'), to: '/groups' },
  { label: t('nav.history'), to: '/history' },
  { label: t('nav.settings'), to: '/settings/project' },
])

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}

const projectItems = computed(() =>
  projectsStore.projects.map(p => ({
    label: p.title,
    value: p._id,
  })),
)

function onProjectChange(val: string) {
  projectsStore.selectProject(val)
  // Recharger la page courante pour prendre en compte le nouveau projet
  router.go(0)
}

// Menu utilisateur
const userMenuItems = computed(() => [
  [
    {
      label: t('auth.editProfile'),
      icon: 'i-heroicons-user',
      onSelect: () => router.push('/settings/profile'),
    },
  ],
  [
    {
      label: t('nav.signOut'),
      icon: 'i-heroicons-arrow-right-on-rectangle',
      onSelect: () => {
        authStore.logout()
        router.push('/auth/sign-in')
      },
    },
  ],
])
</script>

<style scoped>
ufooter {
  background-color: var(--ui-color-primary-500);
  color: white;
}

.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-navbar {
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-bg);
  position: sticky;
  top: 0;
  z-index: 50;
}

.app-content {
  flex: 1;
}
</style>
