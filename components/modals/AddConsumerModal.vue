<!-- Nouvelle clé d'API (consommateur) : ses droits sont parmi ceux de l'appelant
     (l'API refuse les autres). -->
<template>
  <UModal :open="true" @update:open="(open: boolean) => { if (!open) emit('close') }">
    <template #header>
      <h3 class="text-base font-semibold">{{ $t('settings.addConsumer') }}</h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <UFormField :label="$t('common.description')" name="description" required>
          <UInput v-model="form.description" :placeholder="$t('settings.consumerDescriptionPlaceholder')" :disabled="loading" class="w-full" />
        </UFormField>

        <UFormField :label="$t('settings.scopes')">
          <div class="flex flex-col gap-2 mt-1">
            <label v-for="scope in PROJECT_CONSUMER_SCOPES" :key="scope" class="flex items-center gap-2 text-sm cursor-pointer">
              <UCheckbox
                :model-value="form.scope.includes(scope)"
                :disabled="loading"
                @update:model-value="toggleScope(scope, $event === true)"
              />
              <span>{{ $t(consumerScopeLabelKey(scope)) }}</span>
              <code class="text-xs text-muted">{{ scope }}</code>
            </label>
          </div>
        </UFormField>

        <UAlert v-if="error" color="error" :description="error" />
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end w-full">
        <UButton variant="outline" :disabled="loading" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
        <UButton :loading="loading" @click="onCreate">{{ $t('common.create') }}</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { PROJECT_CONSUMER_SCOPES, consumerScopeLabelKey } from '~/utils/scopes'

const emit = defineEmits<{ close: []; saved: [] }>()

const { t } = useI18n()
const gandalf = useGandalf()
const form = reactive({ description: '', scope: [] as string[] })

// UCheckbox (Nuxt UI 3) ne gère qu'un booléen : chaque droit se coche à part
function toggleScope(scope: string, checked: boolean) {
  form.scope = checked
    ? [...new Set([...form.scope, scope])]
    : form.scope.filter(s => s !== scope)
}
const loading = ref(false)
const error = ref<string | null>(null)

async function onCreate() {
  if (!form.description) { error.value = t('errors.required'); return }
  loading.value = true; error.value = null
  try {
    await gandalf.projects.addConsumer({ description: form.description, scope: form.scope })
    emit('saved')
    emit('close')
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = e?.data?.message || t('settings.consumerFailed')
  }
  finally { loading.value = false }
}
</script>
