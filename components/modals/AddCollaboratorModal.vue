<template>
  <UModal :open="true" @close="emit('close')">
    <template #header>
      <h3 class="text-base font-semibold">{{ $t('settings.addExistingUser') }}</h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <!-- Search an existing account by username or email -->
        <UFormField :label="$t('settings.searchUser')" name="search">
          <UInput
            v-model="query"
            :placeholder="$t('settings.searchUserPlaceholder')"
            icon="i-lucide-search"
            :disabled="loading"
            class="w-full"
            @update:model-value="onSearch"
          />
        </UFormField>

        <!-- Results -->
        <div v-if="searching" class="text-sm text-muted">{{ $t('common.loading') }}</div>
        <div v-else-if="results.length" class="border rounded divide-y max-h-40 overflow-y-auto">
          <button
            v-for="u in results"
            :key="u._id"
            type="button"
            class="w-full text-left px-3 py-2 text-sm hover:bg-elevated flex justify-between items-center"
            :class="{ 'bg-elevated': selected?._id === u._id }"
            @click="selected = u"
          >
            <span>{{ u.username }}</span>
            <span class="text-muted text-xs">{{ u.email }}</span>
          </button>
        </div>
        <div v-else-if="query && !searching" class="text-sm text-muted">
          {{ $t('settings.noUserFound') }}
        </div>

        <template v-if="selected">
          <UFormField :label="$t('settings.role')">
            <USelect v-model="role" :items="roleItems" value-key="value" label-key="label" :disabled="loading" class="w-full" />
          </UFormField>

          <UFormField :label="$t('settings.scopes')">
            <div class="space-y-3 mt-1">
              <div v-for="group in PROJECT_USER_SCOPE_GROUPS" :key="group.title">
                <p class="text-xs font-semibold uppercase text-muted mb-1">{{ group.title }}</p>
                <div class="flex flex-wrap gap-x-4 gap-y-1">
                  <label
                    v-for="item in group.scopes"
                    :key="item.key"
                    class="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <UCheckbox
                      :model-value="scope.includes(item.key)"
                      :disabled="loading"
                      @update:model-value="toggleScope(item.key, $event)"
                    />
                    <span>{{ item.label }}</span>
                  </label>
                </div>
              </div>
            </div>
          </UFormField>
        </template>

        <UAlert v-if="error" color="error" :description="error" />
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end w-full">
        <UButton variant="outline" :disabled="loading" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
        <UButton :loading="loading" :disabled="!selected" @click="onAdd">{{ $t('settings.add') }}</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { PROJECT_USER_SCOPE_GROUPS } from '~/utils/scopes'
import type { User } from '~/types/project'

const emit = defineEmits<{ close: []; saved: [] }>()

const { t } = useI18n()
const gandalf = useGandalf()
const toast = useToast()

const query = ref('')
const results = ref<User[]>([])
const selected = ref<User | null>(null)
const role = ref('member')
const scope = ref<string[]>([])
const searching = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const roleItems = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
]

let searchTimer: ReturnType<typeof setTimeout> | null = null
// Monotonic sequence to drop out-of-order search responses.
let searchSeq = 0
function onSearch() {
  selected.value = null
  if (searchTimer) clearTimeout(searchTimer)
  const q = query.value.trim()
  if (!q) { results.value = []; return }
  // Debounce the search to avoid a request per keystroke.
  const seq = ++searchSeq
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      const resp = await gandalf.users.list(10, 1, q)
      // Ignore a stale response if a newer search has started meanwhile.
      if (seq === searchSeq) results.value = resp.data
    }
    catch { if (seq === searchSeq) results.value = [] }
    finally { if (seq === searchSeq) searching.value = false }
  }, 300)
}

// Cancel any pending debounced search when the modal is torn down.
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

function toggleScope(key: string, checked: boolean) {
  if (checked) {
    if (!scope.value.includes(key)) scope.value.push(key)
  }
  else {
    scope.value = scope.value.filter(s => s !== key)
  }
}

async function onAdd() {
  if (!selected.value) return
  loading.value = true
  error.value = null
  try {
    await gandalf.projects.addUser({
      user_id: selected.value._id,
      role: role.value,
      scope: scope.value,
    })
    toast.add({ title: t('settings.collaboratorAdded'), color: 'success' })
    emit('saved')
    emit('close')
  }
  catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = e?.data?.message || t('errors.failedToSave')
  }
  finally { loading.value = false }
}
</script>
