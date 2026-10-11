<!-- Suppression définitive d'un compte par un superadmin (gandalf.api,
     ADMIN.md) : il quitte toutes ses applications, ses invitations sont
     annulées. L'adresse du compte, saisie, confirme. -->
<template>
  <UModal :open="true" @update:open="(open: boolean) => { if (!open) emit('close') }">
    <template #header>
      <h3 class="text-base font-semibold">{{ $t('admin.deleteAccountTitle', { account: account.username }) }}</h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <UAlert color="error" variant="subtle" icon="i-lucide-triangle-alert" :description="$t('admin.deleteAccountWarning')" />

        <div v-if="account.applications.length" class="text-sm">
          <p class="mb-1">{{ $t('admin.deleteAccountLeaves') }}</p>
          <ul class="list-disc pl-5">
            <li v-for="application in account.applications" :key="application._id">
              {{ application.title }}
              <span v-if="application.role === 'admin'" class="text-warning">({{ $t('admin.deleteAccountWasAdmin') }})</span>
            </li>
          </ul>
        </div>

        <UFormField :label="$t('admin.deleteAccountType', { value: expected })" name="confirmation">
          <UInput v-model="confirmation" autocomplete="off" :disabled="loading" class="w-full" autofocus />
        </UFormField>
        <UAlert v-if="error" color="error" :description="error" />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton variant="ghost" :disabled="loading" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
        <UButton color="error" icon="i-lucide-trash-2" :loading="loading" :disabled="confirmation.trim() !== expected" @click="onDelete">
          {{ $t('admin.deleteAccount') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { AdminAccount } from '~/types/admin'
import { deleteConfirmation } from '~/utils/superadmin'
import { apiErrorCode } from '~/utils/apiErrors'

const props = defineProps<{ account: AdminAccount }>()
const emit = defineEmits<{ close: []; deleted: [account: AdminAccount] }>()

const { t } = useI18n()
const gandalf = useGandalf()

const expected = computed(() => deleteConfirmation(props.account))
const confirmation = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

async function onDelete() {
  if (confirmation.value.trim() !== expected.value) return
  loading.value = true
  error.value = null
  try {
    await gandalf.superadmin.deleteUser(props.account._id)
    emit('deleted', props.account)
  }
  catch (err: unknown) {
    error.value = apiErrorCode(err).message || t('admin.deleteAccountFailed')
  }
  finally {
    loading.value = false
  }
}
</script>
