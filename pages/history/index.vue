<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold">{{ $t('history.title') }}</h1>
      <p class="text-muted text-sm mt-1">{{ $t('history.subtitle') }}</p>
    </div>

    <HistoryTable />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>
