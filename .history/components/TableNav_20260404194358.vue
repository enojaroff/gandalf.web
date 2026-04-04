<template>
  <div class="flex gap-1 border-b border-default mb-6">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
      :class="route.path === tab.to
        ? 'border-primary text-primary'
        : 'border-transparent text-muted hover:text-default'"
    >
      {{ tab.label }}
    </NuxtLink>
  </div>
  <div>{{ useRoute() }}</div>
  <!-- Safelist Tailwind: border-primary text-primary border-transparent text-muted hover:text-default -->
</template>

<script setup lang="ts">
const props = defineProps<{
  tableId: string
  variants?: { _id: string; title: string }[]
}>()

const { t } = useI18n()
const route = useRoute()

const tabs = computed(() => [
  { label: t('tables.info'),      to: `/tables/${props.tableId}/info` },
  { label: t('tables.revisions'), to: `/tables/${props.tableId}/revisions` },
  ...(props.variants?.map(v => ({
    label: v.title,
    to: `/tables/${props.tableId}/${v._id}/edit`,
  })) || []),
  { label: t('history.title'),    to: `/tables/${props.tableId}/history` },
])
</script>
