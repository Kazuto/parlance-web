<script setup lang="ts">
import { Button, Dialog, Select } from "@thkzt/eunoia";

// Adds and removes scopes on several entries at once; scopes not listed stay as they are.
const props = defineProps<{ open: boolean; entryIds: string[] }>();
const emit = defineEmits<{ close: []; updated: [entryIds: string[]] }>();
const addScopeIds = ref<string[]>([]);
const removeScopeIds = ref<string[]>([]);
const error = ref<string>();
const entryStore = useEntryStore();
const isPending = computed(() => entryStore.updateScopes.isPending);
const {
  options: scopeOptions,
  error: scopeError,
  isFetching: scopesLoading,
} = useScopeOptions();
// A scope can only be in one list, so each list hides what the other picked.
const addOptions = computed(() =>
  scopeOptions.value.filter(
    (scope) => !removeScopeIds.value.includes(scope.value),
  ),
);
const removeOptions = computed(() =>
  scopeOptions.value.filter(
    (scope) => !addScopeIds.value.includes(scope.value),
  ),
);
const { t } = useI18n();
const { showSuccess, showError } = useErrorHelper();

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    addScopeIds.value = [];
    removeScopeIds.value = [];
    error.value = undefined;
  },
  { immediate: true },
);

function handleClose() {
  if (!isPending.value) emit("close");
}

async function handleSubmit() {
  if (isPending.value) return;
  error.value = undefined;
  if (!addScopeIds.value.length && !removeScopeIds.value.length) {
    error.value = t("entries.bulkScopesRequired");
    return;
  }
  const entryIds = [...props.entryIds];
  try {
    await entryStore.updateScopes.mutateAsync({
      entryIds,
      addScopeIds: addScopeIds.value,
      removeScopeIds: removeScopeIds.value,
    });
    showSuccess(
      t(
        "entries.bulkScopesUpdated",
        { count: entryIds.length },
        entryIds.length,
      ),
    );
    emit("updated", entryIds);
    emit("close");
  } catch (cause) {
    showError(cause as Error);
    error.value =
      cause instanceof Error ? cause.message : t("entries.bulkScopesFailed");
  }
}
</script>

<template>
  <Dialog
    :open
    :title="
      t('entries.bulkScopesTitle', { count: entryIds.length }, entryIds.length)
    "
    :persistent="isPending"
    @close="handleClose"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Select
        v-model="addScopeIds"
        teleport-to="body"
        multiple
        :options="addOptions"
        :disabled="isPending || scopesLoading"
        :placeholder="t('scopes.select')"
        >{{ t("entries.bulkAddScopes") }}</Select
      >
      <Select
        v-model="removeScopeIds"
        teleport-to="body"
        multiple
        :options="removeOptions"
        :disabled="isPending || scopesLoading"
        :placeholder="t('scopes.select')"
        >{{ t("entries.bulkRemoveScopes") }}</Select
      >
      <p class="text-sm text-neutral-500 dark:text-neutral-400">
        {{ t("entries.bulkScopesHint") }}
      </p>
      <p v-if="scopeError" role="alert" class="text-sm text-red-600">
        {{ t("scopes.loadFailed") }}
      </p>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="isPending" @click="handleClose">
          {{ t("common.cancel") }}
        </Button>
        <Button primary :disabled="isPending" @click="handleSubmit">
          {{ isPending ? t("common.saving") : t("common.applyChanges") }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
