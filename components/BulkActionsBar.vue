<!-- Commandes en masse d'une liste (tables, flows), au-dessus du tableau.
     Hauteur fixe, que des lignes soient sélectionnées ou non : le tableau ne se
     décale pas quand les commandes apparaissent (sinon le clic suivant sur une
     case tombe à côté). -->
<template>
  <div
    class="flex items-center gap-2 mb-2 px-3 h-11 rounded-md border"
    :class="count ? 'border-primary/30 bg-primary/5' : 'border-transparent'"
  >
    <span v-if="!count" class="text-sm text-muted">
      Cochez des {{ noun.many }} pour les copier ou les déplacer vers un autre projet.
    </span>
    <template v-else>
      <span class="text-sm font-medium mr-2">
        {{ count }} {{ count > 1 ? noun.many : noun.one }} {{ count > 1 ? noun.selectedMany : noun.selectedOne }}
      </span>
      <UButton size="sm" variant="soft" icon="i-lucide-copy" @click="emit('copy')">
        Copier vers…
      </UButton>
      <UButton size="sm" variant="soft" icon="i-lucide-corner-up-right" @click="emit('move')">
        Déplacer vers…
      </UButton>
      <UButton
        size="sm"
        variant="ghost"
        color="neutral"
        icon="i-lucide-x"
        class="ml-auto"
        @click="emit('clear')"
      >
        Désélectionner
      </UButton>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  resource: 'table' | 'flow'
  count: number
}>()
const emit = defineEmits<{ copy: []; move: []; clear: [] }>()

const NOUNS = {
  table: { one: 'table', many: 'tables', selectedOne: 'sélectionnée', selectedMany: 'sélectionnées' },
  flow: { one: 'flow', many: 'flows', selectedOne: 'sélectionné', selectedMany: 'sélectionnés' },
}
const noun = computed(() => NOUNS[props.resource])
</script>
