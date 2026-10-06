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
          v-if="resource === 'flow'"
          :color="mode === 'move' ? 'warning' : 'info'"
          variant="soft"
          :description="flowTablesNote"
        />

        <UAlert v-if="error" color="error" :title="error">
          <template v-if="failures.length" #description>
            <ul class="list-disc pl-5 space-y-1">
              <li v-for="f in failures" :key="f.id" class="text-sm">« {{ f.title }} » : {{ f.message }}</li>
            </ul>
          </template>
        </UAlert>
        <UAlert v-if="success" color="success" :description="success" />
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end w-full">
        <UButton variant="outline" :disabled="loading" @click="emit('close')">{{ done ? 'Fermer' : 'Annuler' }}</UButton>
        <UButton v-if="!done" :loading="loading" :disabled="!targetProjectId" @click="onSubmit">
          {{ submitLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
/**
 * Modale « Copier vers… / Déplacer vers… » un projet, pour une table ou un flow,
 * ou pour une sélection (`items`, actions en masse de la liste des tables).
 * Le projet source est le projet actif (header X-Application, injecté par
 * useGandalf) ; la cible est choisie ici parmi les autres projets de l'utilisateur.
 * Réservée aux admins — le parent ne monte cette modale que si isAdmin, et l'API
 * refuse (403) le cas échéant.
 */
import { computed, ref } from 'vue'
import { apiErrorMessage } from '~/utils/apiErrors'

interface Target { _id: string; title: string }

const props = defineProps<{
  resource: 'table' | 'flow'
  mode: 'copy' | 'move'
  // Une ressource (`item`) ou plusieurs (`items`)
  item?: Target
  items?: Target[]
}>()
const emit = defineEmits<{ close: []; saved: [] }>()

const gandalf = useGandalf()
const projectsStore = useProjectsStore()

const targets = computed<Target[]>(() => props.items ?? (props.item ? [props.item] : []))
const isBulk = computed(() => targets.value.length > 1)

const loading = ref(false)
const done = ref(false)
const progress = ref(0)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const failures = ref<{ id: string; title: string; message: string }[]>([])
const targetProjectId = ref<string>('')

const NOUNS = {
  table: { one: 'la table', many: 'tables', selected: 'sélectionnées', copied: 'copiées', moved: 'déplacées', leave: 'elles quittent' },
  flow: { one: 'le flow', many: 'flows', selected: 'sélectionnés', copied: 'copiés', moved: 'déplacés', leave: 'ils quittent' },
}
const noun = computed(() => NOUNS[props.resource])
const verb = computed(() => (props.mode === 'copy' ? 'Copier' : 'Déplacer'))

const title = computed(() =>
  isBulk.value
    ? `${verb.value} ${targets.value.length} ${noun.value.many}`
    : `${verb.value} ${noun.value.one}`,
)

const intro = computed(() => {
  if (isBulk.value) {
    const what = `les ${targets.value.length} ${noun.value.many} ${noun.value.selected}`
    return props.mode === 'copy'
      ? `Copier ${what} vers un autre projet (les originaux sont conservés).`
      : `Déplacer ${what} vers un autre projet (${noun.value.leave} le projet actuel).`
  }
  const name = targets.value[0]?.title ?? ''
  return props.mode === 'copy'
    ? `Copier « ${name} » vers un autre projet (l'original est conservé).`
    : `Déplacer « ${name} » vers un autre projet (il quitte le projet actuel).`
})

// Les tables d'un flow suivent dans le projet de destination : l'API réutilise
// celles qui y sont déjà (même origine, toujours compatibles avec le flow) et
// copie les autres.
const flowTablesNote = computed(() => {
  const owner = isBulk.value ? 'ces flows' : 'ce flow'
  const note = props.mode === 'copy'
    ? `Les tables utilisées par ${owner} seront également copiées dans le projet de destination`
    : `Les tables utilisées par ${owner} seront copiées dans le projet de destination (elles restent aussi dans le projet source)`
  return `${note}, sauf celles qui y sont déjà : elles sont réutilisées.`
})

const submitLabel = computed(() =>
  loading.value && isBulk.value
    ? `${verb.value}… ${progress.value}/${targets.value.length}`
    : verb.value,
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
  failures.value = []
  progress.value = 0

  // resource 'table' -> groupe 'tables' ; 'flow' -> 'flows'. mode -> copyTo/moveTo.
  const group = props.resource === 'table' ? gandalf.tables : gandalf.flows
  const action = props.mode === 'copy' ? group.copyTo : group.moveTo

  // Un appel par ressource, l'un après l'autre : chaque échec est rapporté sur
  // sa ressource sans interrompre les suivantes.
  for (const target of targets.value) {
    try {
      await action(target._id, targetProjectId.value)
    }
    catch (err: unknown) {
      failures.value.push({ id: target._id, title: target.title, message: apiErrorMessage(err) || 'Opération impossible.' })
    }
    progress.value++
  }
  loading.value = false

  const succeeded = targets.value.length - failures.value.length
  if (succeeded > 0) emit('saved')

  if (!failures.value.length) {
    success.value = isBulk.value
      ? `${succeeded} ${noun.value.many} ${props.mode === 'copy' ? noun.value.copied : noun.value.moved}.`
      : props.mode === 'copy' ? 'Copie effectuée.' : 'Déplacement effectué.'
    done.value = true
    setTimeout(() => emit('close'), 1000)
  }
  else if (!isBulk.value) {
    error.value = failures.value[0]!.message
    failures.value = []
  }
  else {
    error.value = `${succeeded} sur ${targets.value.length} ${noun.value.many} ${props.mode === 'copy' ? noun.value.copied : noun.value.moved} ; échecs :`
    done.value = succeeded > 0
  }
}
</script>
