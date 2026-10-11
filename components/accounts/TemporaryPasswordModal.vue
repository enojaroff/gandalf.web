<!-- Mot de passe temporaire, montré une seule fois : après la confirmation
     d'une invitation, la création d'un compte, ou sa réinitialisation par un
     superadmin. La personne devra le remplacer à sa première connexion. -->
<template>
  <UModal :open="true" :dismissible="false" @update:open="(open: boolean) => { if (!open) emit('close') }">
    <template #header>
      <h3 class="text-base font-semibold">{{ title }}</h3>
    </template>

    <template #body>
      <dl class="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt class="text-muted">{{ $t('auth.username') }}</dt>
        <dd class="font-mono">{{ username }}</dd>
        <template v-if="email">
          <dt class="text-muted">{{ $t('auth.email') }}</dt>
          <dd>{{ email }}</dd>
        </template>
      </dl>
      <div class="flex items-center gap-2">
        <UInput :model-value="password" readonly class="flex-1 font-mono" />
        <UButton :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'" variant="outline" @click="copy">
          {{ copied ? $t('settings.tempPasswordCopied') : $t('settings.tempPasswordCopy') }}
        </UButton>
      </div>
      <p class="mt-4 text-sm text-muted">{{ $t('settings.tempPasswordMessage') }}</p>
      <p class="mt-2 text-sm text-muted">
        {{ emailSent ? $t('settings.tempPasswordEmailed') : $t('settings.tempPasswordNotEmailed') }}
      </p>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton @click="emit('close')">{{ $t('common.close') }}</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  username: string
  email?: string
  password: string
  emailSent?: boolean
}>()
const emit = defineEmits<{ close: [] }>()

const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.password)
    copied.value = true
  }
  catch { /* presse-papiers indisponible : le champ reste sélectionnable */ }
}
</script>
