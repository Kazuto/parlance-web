<script setup lang="ts">
import { Button, Dialog, Select } from "@thkzt/eunoia";

// Adds and removes tags on several entries at once; tags not listed stay as they
// are. Tags are picked from the scopes chosen first.
const props = defineProps<{ open: boolean; entryIds: string[] }>();
const emit = defineEmits<{ close: []; updated: [entryIds: string[]] }>();
const scopeIds = ref<string[]>([]);
const addTagIds = ref<string[]>([]);
const removeTagIds = ref<string[]>([]);
const entryStore = useEntryStore();
const scopeChoices = useScopeOptions();
const {
  options: scopeOptions,
  error: scopeError,
  isFetching: scopesLoading,
} = scopeChoices;
const { tagOptions } = useScopedTags(scopeIds, addTagIds, scopeChoices);

useScopedTags(scopeIds, removeTagIds, scopeChoices);

// A tag can only be in one list, so each list hides what the other picked.
const addOptions = computed(() =>
  tagOptions.value.filter((tag) => !removeTagIds.value.includes(tag.value)),
);
const removeOptions = computed(() =>
  tagOptions.value.filter((tag) => !addTagIds.value.includes(tag.value)),
);
const { t } = useI18n();
const { showSuccess } = useErrorHelper();

const { error, isPending, submit, cancel } = useFormDialog({
  open: () => props.open,
  isPending: () => entryStore.updateTags.isPending,
  reset: () => {
    scopeIds.value = [];
    addTagIds.value = [];
    removeTagIds.value = [];
  },
  close: () => emit("close"),
});

function handleSubmit() {
  submit(async () => {
    if (!addTagIds.value.length && !removeTagIds.value.length) {
      error.value = t("entries.bulkTagsRequired");

      return false;
    }

    const entryIds = [...props.entryIds];

    await entryStore.updateTags.mutateAsync({
      entryIds,
      addTagIds: addTagIds.value,
      removeTagIds: removeTagIds.value,
    });
    showSuccess(
      t("entries.bulkTagsUpdated", { count: entryIds.length }, entryIds.length),
    );
    emit("updated", entryIds);
  });
}
</script>

<template>
  <Dialog
    :open
    :title="
      t('entries.bulkTagsTitle', { count: entryIds.length }, entryIds.length)
    "
    :persistent="isPending"
    @close="cancel"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Select
        v-model="scopeIds"
        teleport-to="body"
        multiple
        :options="scopeOptions"
        :disabled="isPending || scopesLoading"
        :placeholder="t('tags.pickScopes')"
        >{{ t("nav.scopes") }}</Select
      >
      <template v-if="scopeIds.length">
        <p
          v-if="!tagOptions.length"
          class="text-sm text-neutral-500 dark:text-neutral-400"
        >
          {{ t("tags.noneInScopes") }}
        </p>
        <template v-else>
          <Select
            v-model="addTagIds"
            teleport-to="body"
            multiple
            :options="addOptions"
            :disabled="isPending"
            :placeholder="t('tags.select')"
            >{{ t("entries.bulkAddTags") }}</Select
          >
          <Select
            v-model="removeTagIds"
            teleport-to="body"
            multiple
            :options="removeOptions"
            :disabled="isPending"
            :placeholder="t('tags.select')"
            >{{ t("entries.bulkRemoveTags") }}</Select
          >
        </template>
      </template>
      <p class="text-sm text-neutral-500 dark:text-neutral-400">
        {{ t("entries.bulkTagsHint") }}
      </p>
      <p v-if="scopeError" role="alert" class="text-sm text-red-600">
        {{ t("scopes.loadFailed") }}
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
