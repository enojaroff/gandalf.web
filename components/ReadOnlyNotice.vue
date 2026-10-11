<!-- Bandeau « lecture seule » d'un écran d'édition : le droit `scope` manque
     pour enregistrer (action « save ») ou pour créer (« create »). Rien tant
     que les droits du membre ne sont pas chargés, pour ne pas clignoter. -->
<template>
  <UAlert
    v-if="shown"
    color="neutral"
    variant="subtle"
    icon="i-lucide-lock"
    class="mb-4"
    :description="$t(action === 'create' ? 'rights.readOnlyCreate' : 'rights.readOnlySave', { right: $t(userScopeBadges([scope])[0]!.labelKey ?? scope) })"
  />
</template>

<script setup lang="ts">
import { userScopeBadges } from '~/utils/scopes'

const props = defineProps<{ scope: string; action?: 'save' | 'create' }>()

const projectsStore = useProjectsStore()
const shown = computed(() => projectsStore.currentUserScopes !== null && !projectsStore.can(props.scope))
</script>
