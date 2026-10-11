<template>
  <div class="text-center py-12">
    <UIcon name="i-lucide-sparkles" class="text-6xl text-primary mb-6" />
    <h1 class="text-3xl font-bold mb-4">{{ $t('welcome.title') }}</h1>

    <!-- Seul un superadmin crée une application (gandalf.api, ADMIN.md) -->
    <template v-if="userStore.isSuperadmin">
      <p class="text-muted text-lg mb-8 max-w-md mx-auto">{{ $t('welcome.createFirst') }}</p>
      <UButton to="/welcome/project/create" size="lg" icon="i-lucide-plus">
        {{ $t('settings.createApplication.title') }}
      </UButton>
    </template>

    <template v-else-if="userStore.currentUser">
      <p class="text-muted text-lg mb-2 max-w-md mx-auto">{{ $t('welcome.noApplication') }}</p>
      <p class="text-muted mb-8 max-w-md mx-auto">{{ $t('welcome.askInvite') }}</p>
      <div class="flex justify-center gap-2">
        <UButton icon="i-lucide-refresh-cw" :loading="refreshing" @click="refresh">{{ $t('welcome.refresh') }}</UButton>
        <UButton variant="outline" icon="i-lucide-log-out" @click="signOut">{{ $t('nav.signOut') }}</UButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'auth' })

const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()
const userStore = useUserStore()
const projectsStore = useProjectsStore()

const refreshing = ref(false)

onMounted(() => {
  if (!userStore.currentUser) userStore.fetchCurrent()
})

// Une invitation acceptée entre-temps : l'application apparaît dans la liste
async function refresh() {
  refreshing.value = true
  try {
    await projectsStore.fetchAll()
    if (projectsStore.projects.length > 0) await navigateTo('/tables')
    else toast.add({ title: t('welcome.noApplication'), color: 'neutral' })
  }
  finally {
    refreshing.value = false
  }
}

function signOut() {
  authStore.logout()
  navigateTo('/auth/sign-in')
}
</script>
