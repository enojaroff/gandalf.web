<!-- Répartition des variantes d'une version : un réglage d'exploitation, qui
     change sans créer de version (y compris sur la version active). -->
<template>
  <UModal :open="true" @update:open="(open: boolean) => { if (!open) emit('close') }">
    <template #header>
      <h3 class="text-base font-semibold">{{ $t('versions.splitTitle') }}</h3>
    </template>

    <template #body>
      <div v-if="!variants.length && !error" class="flex justify-center py-6">
        <UIcon name="i-lucide-refresh-cw" class="animate-spin text-2xl text-primary" />
      </div>

      <div v-else class="space-y-4 text-sm">
        <p class="text-muted">{{ $t('versions.splitHint') }}</p>
        <UAlert v-if="version.is_active" color="info" variant="soft" :description="$t('versions.splitActive')" />
        <UFormField :label="$t('versions.splitMode')">
          <USelect v-model="mode" :items="modes" class="w-full" />
        </UFormField>
        <div v-if="mode === 'percent'" class="space-y-2">
          <div v-for="variant in variants" :key="variant._id" class="flex items-center gap-3">
            <span class="flex-1 truncate">{{ variant.title }}</span>
            <UInput v-model.number="variant.probability" type="number" min="0" max="100" class="w-24" />
            <span class="text-muted">%</span>
          </div>
          <p :class="valid ? 'text-muted' : 'text-error'">
            {{ valid ? $t('versions.splitTotal', { total }) : $t('versions.splitInvalid') }}
          </p>
        </div>
        <UAlert v-if="error" color="error" variant="soft" :description="error" />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton variant="ghost" :disabled="loading" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
        <UButton :loading="loading" :disabled="!valid || !variants.length" @click="onSubmit">{{ $t('common.save') }}</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { SplitMode, TableVersionSummary } from '~/types/version'
import { apiErrorCode, apiValidationMessages } from '~/utils/apiErrors'
import { isSplitValid, splitTotal } from '~/utils/versions'

const props = defineProps<{ tableId: string; version: TableVersionSummary }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { t } = useI18n()
const gandalf = useGandalf()

const mode = ref<SplitMode>((props.version.variants_probability as SplitMode) || 'first')
const variants = ref<{ _id: string; title: string; probability: number }[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const modes = computed(() => [
  { label: t('versions.splitFirst'), value: 'first' },
  { label: t('versions.splitRandom'), value: 'random' },
  { label: t('versions.splitPercent'), value: 'percent' },
])
const total = computed(() => splitTotal(variants.value))
const valid = computed(() => isSplitValid(mode.value, variants.value))

onMounted(async () => {
  try {
    const response = await gandalf.tables.versions.get(props.tableId, props.version._id)
    variants.value = response.data.variants.map(v => ({ _id: v._id, title: v.title, probability: v.probability ?? 0 }))
  }
  catch (e) {
    error.value = apiErrorCode(e).message || t('errors.failedToLoad')
  }
})

async function onSubmit() {
  if (loading.value || !valid.value) return
  loading.value = true
  error.value = null
  try {
    await gandalf.tables.versions.split(
      props.tableId,
      props.version._id,
      mode.value,
      variants.value.map(v => ({ _id: v._id, probability: Number(v.probability) || 0 })),
    )
    emit('saved')
    emit('close')
  }
  catch (e) {
    error.value = apiValidationMessages(e).join(' ') || apiErrorCode(e).message || t('errors.failedToSave')
  }
  finally { loading.value = false }
}
</script>
