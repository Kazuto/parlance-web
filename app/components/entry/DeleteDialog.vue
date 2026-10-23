<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";

const props = defineProps<{ open: boolean; item?: Entry }>();
const emit = defineEmits<{ close: []; deleted: [id: string] }>();
const { t } = useI18n();
const entryStore = useEntryStore();
const { isPending, run, cancel } = useConfirmMutation(
  () => entryStore.destroy,
  () => emit("close"),
);

async function handleConfirm() {
  const id = props.item?.id;

  if (!id) return;

  const key = props.item?.key ?? "";

  if (await run({ id }, t("entries.deleted", { key }))) {
    emit("deleted", id);
  }
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('entries.deleteTitle', { key: item?.key ?? '' })"
    :persistent="isPending"
    @cancel="cancel"
    @close="cancel"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-700 dark:text-neutral-200">
      {{ t("entries.deleteConfirm") }}
    </p>
  </ConfirmDialog>
</template>
