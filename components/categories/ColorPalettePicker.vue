<script setup lang="ts">
/**
 * Sélecteur de couleur parmi la palette prédéfinie (pastilles cliquables).
 * v-model = la couleur hex sélectionnée. Pas de saisie libre : garantit des
 * couleurs cohérentes et lisibles. Repris de genesis.
 */
import { CATEGORY_COLORS } from '~/composables/useCategoryColors'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [color: string] }>()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="color in CATEGORY_COLORS"
      :key="color"
      type="button"
      class="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
      :class="modelValue === color ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white dark:ring-offset-gray-900' : ''"
      :style="{ backgroundColor: color }"
      :title="color"
      :aria-label="`Couleur ${color}`"
      :aria-pressed="modelValue === color"
      @click="emit('update:modelValue', color)"
    />
  </div>
</template>
