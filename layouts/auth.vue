<template>
  <div class="auth-layout">
    <div class="auth-container">
      <!-- Logo -->
      <div class="auth-header">
        <NuxtLink to="/" class="auth-logo">
          <img :src="logoUrl" alt="Gandalf" class="h-12 w-auto mx-auto" />
        </NuxtLink>
        <p class="text-sm text-muted mt-1">Decision Engine</p>
      </div>

      <!-- Card de contenu -->
      <UCard class="auth-card">
        <slot />
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import logoUrl from '~/assets/images/logo.svg'
</script>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ui-bg-muted);
}

.auth-container {
  width: 100%;
  max-width: 420px;
  padding: 1rem;
}

.auth-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.auth-logo {
  text-decoration: none;
}

.auth-card {
  padding: 2rem;
}
</style>
