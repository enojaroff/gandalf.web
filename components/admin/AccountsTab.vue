<!-- Onglet Comptes de l'administration (superadmin, gandalf.api ADMIN.md) :
     tous les comptes et leurs applications, y compris ceux qui n'en ont plus et
     qu'aucun écran d'application n'atteint. Un superadmin leur donne un mot de
     passe temporaire ou les supprime, sauf le sien et ceux des superadmins. -->
<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <UInput v-model="search" icon="i-lucide-search" :placeholder="$t('admin.accountsSearch')" size="sm" class="w-72" />
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <USwitch v-model="withoutApplication" size="sm" />
          {{ $t('admin.accountsWithoutApplication') }}
        </label>
      </div>
    </template>

    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-refresh-cw" class="animate-spin text-2xl text-primary" />
    </div>
    <div v-else-if="!accounts.length" class="text-center py-8 text-muted">{{ $t('admin.accountsEmpty') }}</div>
    <UTable v-else :data="accounts" :columns="columns">
      <template #account-cell="{ row }">
        <div class="min-w-0">
          <div class="font-medium truncate">{{ row.original.username }}</div>
          <div class="text-xs text-muted truncate">{{ row.original.email }}</div>
          <div v-if="row.original.temporary_email" class="text-xs text-muted truncate">
            {{ $t('admin.accountPendingEmail', { email: row.original.temporary_email }) }}
          </div>
        </div>
      </template>
      <template #applications-cell="{ row }">
        <div v-if="row.original.applications.length" class="flex flex-wrap gap-1">
          <UBadge
            v-for="application in row.original.applications"
            :key="application._id"
            :color="application.role === 'admin' ? 'primary' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{ application.role === 'admin' ? `${application.title} · admin` : application.title }}
          </UBadge>
        </div>
        <UBadge v-else color="warning" variant="subtle" size="sm">{{ $t('admin.accountNoApplication') }}</UBadge>
      </template>
      <template #status-cell="{ row }">
        <div class="flex flex-wrap gap-1">
          <UBadge v-if="row.original.superadmin" color="primary" size="sm">{{ $t('admin.accountSuperadmin') }}</UBadge>
          <UBadge v-if="!row.original.active" color="warning" variant="subtle" size="sm">{{ $t('admin.accountPending') }}</UBadge>
          <UBadge v-else-if="row.original.must_change_password" color="neutral" variant="subtle" size="sm">{{ $t('admin.accountTemporaryPassword') }}</UBadge>
          <UBadge v-else color="success" variant="subtle" size="sm">{{ $t('admin.accountActive') }}</UBadge>
        </div>
      </template>
      <template #actions-cell="{ row }">
        <div v-if="!accountLocked(row.original, selfId)" class="flex justify-end gap-1">
          <UButton
            icon="i-lucide-key-round"
            size="xs"
            variant="ghost"
            :loading="resettingId === row.original._id"
            :title="$t('admin.resetPassword')"
            @click="resetPassword(row.original)"
          />
          <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" :title="$t('admin.deleteAccount')" @click="() => { deleting = row.original }" />
        </div>
      </template>
    </UTable>
    <div v-if="total > size" class="flex justify-end mt-4">
      <UPagination :page="page" :items-per-page="size" :total="total" @update:page="(p: number) => { page = p }" />
    </div>
  </UCard>

  <DeleteAccountModal v-if="deleting" :account="deleting" @close="deleting = null" @deleted="onDeleted" />
  <TemporaryPasswordModal
    v-if="reset"
    :title="$t('admin.resetPasswordDone')"
    :username="reset.username"
    :email="reset.email"
    :password="reset.temporary_password"
    :email-sent="reset.email_sent"
    @close="reset = null"
  />
</template>

<script setup lang="ts">
import type { AdminAccount, PasswordResetResult } from '~/types/admin'
import DeleteAccountModal from '~/components/admin/DeleteAccountModal.vue'
import TemporaryPasswordModal from '~/components/accounts/TemporaryPasswordModal.vue'
import { accountLocked } from '~/utils/superadmin'
import { apiErrorCode } from '~/utils/apiErrors'

// Une suppression change les membres des applications listées par la page
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const toast = useToast()
const gandalf = useGandalf()
const userStore = useUserStore()

const accounts = ref<AdminAccount[]>([])
const loading = ref(false)
const search = ref('')
const withoutApplication = ref(false)
const page = ref(1)
const size = 50
const total = ref(0)
const deleting = ref<AdminAccount | null>(null)
const resettingId = ref<string | null>(null)
const reset = ref<PasswordResetResult | null>(null)

const selfId = computed(() => userStore.currentUser?._id)

const columns = computed(() => [
  { id: 'account', header: t('admin.account') },
  { id: 'applications', header: t('admin.applications') },
  { id: 'status', header: t('admin.accountStatus') },
  { id: 'actions', header: '' },
])

// Une réponse plus ancienne que la dernière recherche est ignorée
let sequence = 0

async function load() {
  const current = ++sequence
  loading.value = true
  try {
    const response = await gandalf.superadmin.users({
      search: search.value.trim() || undefined,
      without_application: withoutApplication.value ? 1 : undefined,
      size,
      page: page.value,
    })
    if (current !== sequence) return
    accounts.value = response.data
    total.value = response.paging?.total ?? response.data.length
  }
  catch {
    if (current === sequence) toast.add({ title: t('errors.failedToLoad'), color: 'error' })
  }
  finally {
    if (current === sequence) loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})
watch(withoutApplication, () => {
  page.value = 1
  load()
})
watch(page, () => load())
onMounted(load)
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer) })

async function resetPassword(account: AdminAccount) {
  if (!confirm(t('admin.resetPasswordConfirm', { account: account.username }))) return
  resettingId.value = account._id
  try {
    const response = await gandalf.superadmin.resetPassword(account._id)
    reset.value = response.data
    await load()
  }
  catch (err: unknown) {
    toast.add({ title: apiErrorCode(err).message || t('admin.resetPasswordFailed'), color: 'error' })
  }
  finally {
    resettingId.value = null
  }
}

async function onDeleted(account: AdminAccount) {
  deleting.value = null
  toast.add({ title: t('admin.accountDeleted', { account: account.username }), color: 'success' })
  emit('changed')
  await load()
}
</script>
