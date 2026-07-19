<template>
  <UModal :open="true" @close="emit('close')">
    <template #header>
      <h3 class="text-base font-semibold">{{ title }}</h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          {{ intro }}
        </p>

        <UFormField label="Projet de destination">
          <USelect
            v-model="targetProjectId"
            :items="projectItems"
            value-key="value"
            label-key="label"
            placeholder="Choisir un projet…"
            :disabled="loading"
            class="w-full"
          />
        </UFormField>

        <UAlert
          v-if="mode === 'move' && resource === 'flow'"
          color="warning"
          variant="soft"
          description="Les tables utilisées par ce flow seront copiées dans le projet de destination (elles restent aussi dans le projet source)."
        />
        <UAlert
          v-else-if="mode === 'copy' && resource === 'flow'"
          color="info"
          variant="soft"
          description="Les tables utilisées par ce flow seront également copiées dans le projet de destination."
        />

        <UAlert v-if="error" color="error" :description="error" />
        <UAlert v-if="success" color="success" :description="success" />
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end w-full">
        <UButton variant="outline" :disabled="loading" @click="emit('close')">Annuler</UButton>
        <UButton :loading="loading" :disabled="!targetProjectId" @click="onSubmit">
          {{ mode === 'copy' ? 'Copier' : 'Déplacer' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
/**
 * Modale « Copier vers… / Déplacer vers… » un projet, pour une table ou un flow.
 * Le projet source est le projet actif (header X-Application, injecté par
 * useGandalf) ; la cible est choisie ici parmi les autres projets de l'utilisateur.
 * Réservée aux admins — le parent ne monte cette modale que si isAdmin, et l'API
 * refuse (403) le cas échéant.
 */
import { computed, reactive, ref } from 'vue'

const props = defineProps<{
  resource: 'table' | 'flow'
  mode: 'copy' | 'move'
  item: { _id: string; title: string }
}>()
const emit = defineEmits<{ close: []; saved: [] }>()

const gandalf = useGandalf()
const projectsStore = useProjectsStore()

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const targetProjectId = ref<string>('')

const resourceLabel = computed(() => (props.resource === 'table' ? 'la table' : 'le flow'))

const title = computed(() =>
  `${props.mode === 'copy' ? 'Copier' : 'Déplacer'} ${resourceLabel.value}`,
)

const intro = computed(() =>
  props.mode === 'copy'
    ? `Copier « ${props.item.title} » vers un autre projet (l'original est conservé).`
    : `Déplacer « ${props.item.title} » vers un autre projet (il quitte le projet actuel).`,
)

// Projets cibles = tous les projets sauf le projet actif (source).
const projectItems = computed(() =>
  projectsStore.projects
    .filter(p => p._id !== projectsStore.selectedProjectId)
    .map(p => ({ value: p._id, label: p.title })),
)

async function onSubmit() {
  if (!targetProjectId.value) return
  loading.value = true
  error.value = null
  try {
    // resource 'table' -> groupe 'tables' ; 'flow' -> 'flows'. mode -> copyTo/moveTo.
    const group = props.resource === 'table' ? gandalf.tables : gandalf.flows
    const action = props.mode === 'copy' ? group.copyTo : group.moveTo
    await action(props.item._id, targetProjectId.value)
    success.value = props.mode === 'copy' ? 'Copie effectuée.' : 'Déplacement effectué.'
    emit('saved')
    setTimeout(() => emit('close'), 1000)
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = e?.data?.message || 'Opération impossible.'
  }
  finally {
    loading.value = false
  }
}
</script>
