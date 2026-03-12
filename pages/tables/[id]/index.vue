<script setup lang="ts">
// Redirige vers l'onglet info par défaut
const route = useRoute()
await navigateTo(`/tables/${route.params.id}/info`, { replace: true })
</script>
