<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";

const props = defineProps<{ open: boolean; item?: Entry }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const entryStore = useEntryStore();
const { isPending, run, cancel } = useConfirmMutation(
  () => entryStore.restore,
  () => emit("close"),
);

function handleConfirm() {
  if (!props.item?.id) return;
  run(
    { id: props.item.id },
    t("entries.restored", { key: props.item.key ?? "" }),
  );
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('entries.restoreTitle', { key: item?.key ?? '' })"
    :persistent="isPending"
    @cancel="cancel"
    @close="cancel"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-700 dark:text-neutral-200">
      {{ t("entries.restoreConfirm") }}
    </p>
  </ConfirmDialog>
</template>
