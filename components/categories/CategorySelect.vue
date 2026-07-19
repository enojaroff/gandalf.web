<script setup lang="ts">
/**
 * Sélecteur d'UNE catégorie (ou aucune) pour une table ou un flow, sous forme de
 * liste déroulante avec une pastille colorée devant chaque catégorie (dans les
 * options ET dans la valeur sélectionnée). v-model = l'id de la catégorie, ou null.
 * La liste des catégories disponibles est passée en prop.
 */
import { computed } from 'vue'
import type { Category } from '~/types/category'

const props = defineProps<{
  modelValue: string | null | undefined
  categories: Category[]
}>()
const emit = defineEmits<{ 'update:modelValue': [id: string | null] }>()

// reka-ui (USelect) réserve la chaîne vide comme « aucune sélection » et refuse
// un item de value '' : on représente « aucune catégorie » par une sentinelle
// non-vide, convertie depuis/vers null aux frontières du composant.
const NONE = '__none__'

const options = computed(() => [
  { label: 'Aucune', value: NONE },
  ...props.categories.map(c => ({ label: c.name, value: c.id })),
])

// Couleur d'une catégorie par son id (pour la pastille de la valeur sélectionnée,
// dont le slot #leading ne reçoit que le modelValue, pas l'objet option).
const colorById = computed(() => new Map(props.categories.map(c => [c.id, c.color])))

// Le v-model exposé au parent reste string | null ; en interne on manipule la
// sentinelle pour l'option « Aucune ».
const selected = computed<string>({
  get: () => props.modelValue ?? NONE,
  set: (v: string) => emit('update:modelValue', v === NONE ? null : v),
})
</script>

<template>
  <USelect
    v-model="selected"
    :items="options"
    value-key="value"
    label-key="label"
    class="w-56"
  >
    <!-- Pastille colorée devant chaque option de la liste. -->
    <template #item-leading="{ item }">
      <span
        v-if="item.value !== NONE"
        class="w-2.5 h-2.5 rounded-full inline-block shrink-0"
        :style="{ backgroundColor: colorById.get(item.value as string) }"
      />
    </template>

    <!-- Pastille colorée devant la valeur sélectionnée (remplace l'icône tag). -->
    <template #leading>
      <span
        v-if="modelValue && colorById.get(modelValue)"
        class="w-2.5 h-2.5 rounded-full inline-block shrink-0"
        :style="{ backgroundColor: colorById.get(modelValue) }"
      />
      <UIcon v-else name="i-lucide-tag" class="size-4 text-dimmed" />
    </template>
  </USelect>
</template>
