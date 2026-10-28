<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";

// Deletes the ticked entries; they can be restored from the deleted entries.
const props = defineProps<{ open: boolean; entryIds: string[] }>();
const emit = defineEmits<{ close: []; deleted: [ids: string[]] }>();
const { t } = useI18n();
const entryStore = useEntryStore();
const { isPending, run, cancel } = useConfirmMutation(
  () => entryStore.destroyMany,
  () => emit("close"),
);

async function handleConfirm() {
  const ids = [...props.entryIds];

  if (!ids.length) return;

  const count = ids.length;

  if (await run({ ids }, t("entries.bulkDeleted", { count }, count))) {
    emit("deleted", ids);
  }
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="
      t('entries.bulkDeleteTitle', { count: entryIds.length }, entryIds.length)
    "
    :persistent="isPending"
    @cancel="cancel"
    @close="cancel"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-700 dark:text-neutral-200">
      {{ t("entries.bulkDeleteConfirm") }}
    </p>
  </ConfirmDialog>
</template>
