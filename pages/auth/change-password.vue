<!-- Choix d'un nouveau mot de passe, imposé tant que le mot de passe est
     temporaire (donné par un admin ou un superadmin) : l'API refuse tout le
     reste (403 password_change_required) et la garde globale ramène ici. -->
<template>
  <div>
    <h1 class="text-2xl font-bold text-center mb-2">
      {{ temporary ? $t('auth.changePasswordRequiredTitle') : $t('auth.changePasswordTitle') }}
    </h1>
    <p v-if="temporary" class="text-sm text-muted text-center mb-6">{{ $t('auth.changePasswordRequiredIntro') }}</p>

    <div v-if="!ready" class="flex justify-center py-8">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-2xl text-primary" />
    </div>
    <ChangePasswordForm v-else :temporary="temporary" @done="onDone">
      <template #actions="{ saving }">
        <UButton variant="ghost" :disabled="saving" @click="signOut">{{ $t('auth.signOut') }}</UButton>
      </template>
    </ChangePasswordForm>
  </div>
</template>

<script setup lang="ts">
import ChangePasswordForm from '~/components/accounts/ChangePasswordForm.vue'

definePageMeta({ layout: 'auth', middleware: 'auth' })

const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()
const userStore = useUserStore()
const projectsStore = useProjectsStore()

const ready = ref(false)
const temporary = computed(() => userStore.currentUser?.must_change_password === true)

onMounted(async () => {
  try {
    if (!userStore.currentUser) await userStore.fetchCurrent()
  }
  finally { ready.value = true }
})

// Comme après la connexion : les applications de la personne, ou l'accueil
async function onDone() {
  toast.add({ title: t('auth.passwordChanged'), color: 'success' })
  await projectsStore.fetchAll()
  await navigateTo(projectsStore.projects.length ? '/tables' : '/welcome')
}

function signOut() {
  authStore.logout()
  navigateTo('/auth/sign-in')
}
</script>
