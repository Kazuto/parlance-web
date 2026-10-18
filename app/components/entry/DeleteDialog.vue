<script setup lang="ts">
import { Button, Dialog } from "@thkzt/eunoia";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";

const props = defineProps<{ open: boolean; item?: Entry }>();
const emit = defineEmits<{ close: []; deleted: [id: string] }>();
const entryStore = useEntryStore();
const deleteEntry = entryStore.destroy.mutateAsync;
const isPending = computed(() => entryStore.destroy.isPending);
const error = ref<string>();
const { t } = useI18n();
const { showSuccess, showError } = useErrorHelper();
watch(
  () => props.open,
  () => {
    error.value = undefined;
  },
);

function handleClose() {
  if (!isPending.value) emit("close");
}

async function handleSubmit() {
  const entry = props.item;
  if (!entry?.id || isPending.value) return;
  error.value = undefined;
  try {
    await deleteEntry({ id: entry.id });
    showSuccess(t("entries.deleted", { key: entry.key ?? "" }));
    emit("deleted", entry.id);
    emit("close");
  } catch (cause) {
    showError(cause as Error);
    error.value =
      cause instanceof Error ? cause.message : t("entries.deleteFailed");
  }
}
</script>

<template>
  <Dialog
    :open
    :title="t('entries.deleteTitle', { key: item?.key ?? '' })"
    :persistent="isPending"
    @close="handleClose"
  >
    <p class="text-sm text-neutral-700 dark:text-neutral-200">
      {{ t("entries.deleteConfirm") }}
    </p>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="isPending" @click="handleClose">
          {{ t("common.cancel") }}
        </Button>
        <Button destructive :disabled="isPending" @click="handleSubmit">
          {{ isPending ? t("common.deleting") : t("entries.delete") }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
