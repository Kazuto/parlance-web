<script setup lang="ts">
import { Alert, Button, Dialog, Select } from "@thkzt/eunoia";

// Adds several entries to pending releases and removes them from others; releases
// not listed stay as they are.
const props = defineProps<{ open: boolean; entryIds: string[] }>();
const emit = defineEmits<{ close: []; updated: [entryIds: string[]] }>();
const addReleaseIds = ref<string[]>([]);
const removeReleaseIds = ref<string[]>([]);
const entryStore = useEntryStore();
const {
  pendingOptions,
  error: releaseError,
  isFetching: releasesLoading,
} = useReleaseOptions();

// A release can only be in one list, so each list hides what the other picked.
const addOptions = computed(() =>
  pendingOptions.value.filter(
    (release) => !removeReleaseIds.value.includes(release.value),
  ),
);
const removeOptions = computed(() =>
  pendingOptions.value.filter(
    (release) => !addReleaseIds.value.includes(release.value),
  ),
);
const { t } = useI18n();
const { showSuccess } = useErrorHelper();
const liveCount = useLiveEntryCount(
  () => props.entryIds,
  () => props.open && addReleaseIds.value.length > 0,
);

const { error, isPending, submit, cancel } = useFormDialog({
  open: () => props.open,
  isPending: () => entryStore.updateReleases.isPending,
  reset: () => {
    addReleaseIds.value = [];
    removeReleaseIds.value = [];
  },
  close: () => emit("close"),
});

function handleSubmit() {
  submit(async () => {
    if (!addReleaseIds.value.length && !removeReleaseIds.value.length) {
      error.value = t("entries.bulkReleasesRequired");

      return false;
    }

    const entryIds = [...props.entryIds];

    await entryStore.updateReleases.mutateAsync({
      entryIds,
      addReleaseIds: addReleaseIds.value,
      removeReleaseIds: removeReleaseIds.value,
    });
    showSuccess(
      t(
        "entries.bulkReleasesUpdated",
        { count: entryIds.length },
        entryIds.length,
      ),
    );
    emit("updated", entryIds);
  });
}
</script>

<template>
  <Dialog
    :open
    :title="
      t(
        'entries.bulkReleasesTitle',
        { count: entryIds.length },
        entryIds.length,
      )
    "
    :persistent="isPending"
    @close="cancel"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Select
        v-model="addReleaseIds"
        teleport-to="body"
        multiple
        :options="addOptions"
        :disabled="isPending || releasesLoading"
        :placeholder="
          t(pendingOptions.length ? 'releases.select' : 'releases.nonePending')
        "
        >{{ t("entries.bulkAddReleases") }}</Select
      >
      <Select
        v-model="removeReleaseIds"
        teleport-to="body"
        multiple
        :options="removeOptions"
        :disabled="isPending || releasesLoading"
        :placeholder="
          t(pendingOptions.length ? 'releases.select' : 'releases.nonePending')
        "
        >{{ t("entries.bulkRemoveReleases") }}</Select
      >
      <p class="text-sm text-neutral-500 dark:text-neutral-400">
        {{ t("entries.bulkReleasesHint") }}
      </p>
      <Alert v-if="liveCount" variant="warning" dense persistent>
        {{ t("releases.liveWarning", { count: liveCount }, liveCount) }}
      </Alert>
      <p v-if="releaseError" role="alert" class="text-sm text-red-600">
        {{ t("releases.loadFailed") }}
      </p>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="isPending" @click="cancel">
          {{ t("common.cancel") }}
        </Button>
        <Button primary :disabled="isPending" @click="handleSubmit">
          {{ isPending ? t("common.saving") : t("common.applyChanges") }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
