<template>
  <div class="text-center py-12">
    <UIcon name="i-heroicons-sparkles" class="text-6xl text-primary mb-6" />
    <h1 class="text-3xl font-bold mb-4">Welcome to Gandalf!</h1>
    <p class="text-muted text-lg mb-8 max-w-md mx-auto">
      Let's get started by creating your first project.
    </p>
    <UButton to="/welcome/project/create" size="lg" icon="i-heroicons-plus">
      Create Project
    </UButton>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'auth' })
</script>
