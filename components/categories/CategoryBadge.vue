<script setup lang="ts">
/**
 * Badge d'une catégorie : nom sur fond de la couleur de la catégorie, avec un
 * texte au contraste lisible (noir/blanc selon la luminance). Purement
 * présentationnel. Repris de genesis pour une pastille homogène entre produits.
 */
import { computed } from 'vue'
import { textColorOn } from '~/composables/useCategoryColors'

const props = defineProps<{
  name: string
  color: string
  size?: 'xs' | 'sm'
}>()

const style = computed(() => ({
  backgroundColor: props.color,
  color: textColorOn(props.color),
}))

const sizeClass = computed(() =>
  props.size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
)
</script>

<template>
  <span
    class="inline-flex items-center rounded-full font-medium leading-none"
    :class="sizeClass"
    :style="style"
  >
    {{ name }}
  </span>
</template>
