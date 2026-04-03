<template>
  <div class="app-layout">
    <!-- Navbar -->
    <header class="app-navbar">
      <UContainer class="flex items-center justify-between h-16">
        <!-- Logo -->
        <NuxtLink to="/tables" class="flex items-center gap-2">
          <img :src="logoUrl" alt="Gandalf" class="h-12 w-auto" />
        </NuxtLink>

        <!-- Navigation principale -->
        <nav class="hidden md:flex items-center gap-1">
          <UButton
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            variant="ghost"
            :active="isActive(item.to)"
          >
            {{ item.label }}
          </UButton>
        </nav>

        <!-- Sélecteur de projet + menu utilisateur -->
        <div class="flex items-center gap-3">
          <!-- Sélecteur de projet -->
          <USelect
            v-if="projectsStore.projects.length > 0"
            :model-value="projectsStore.selectedProjectId ?? undefined"
            :items="projectItems"
            class="w-48"
            size="sm"
            @update:model-value="onProjectChange"
          />

          <!-- Menu utilisateur -->
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
        <img :src="logoUrl" alt="Gandalf" class="h-12 w-auto" />
      </UContainer>
    </UFooter>
  </div>

</template>

<script setup lang="ts">
import logoUrl from '~/assets/images/logo.svg'

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

const navItems = [
  { label: 'Tables', to: '/tables' },
  { label: 'Groups', to: '/groups' },
  { label: 'History', to: '/history' },
  { label: 'Settings', to: '/settings/project' },
]

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
      label: 'Edit profile',
      icon: 'i-heroicons-user',
      onSelect: () => router.push('/settings/profile'),
    },
  ],
  [
    {
      label: 'Sign out',
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
