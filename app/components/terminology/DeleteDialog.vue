<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Terminology } from "~/lib/api/schemas/parlance/v1/TerminologySchema";

const props = defineProps<{ open: boolean; item?: Terminology }>();
const emit = defineEmits<{ close: []; deleted: [id: string] }>();
const { t } = useI18n();
const terminologyStore = useTerminologyStore();
const { isPending, run, cancel } = useConfirmMutation(
  () => terminologyStore.destroy,
  () => emit("close"),
);

async function handleConfirm() {
  const id = props.item?.id;

  if (!id) return;

  const term = props.item?.term ?? "";

  if (await run({ id }, t("terminologies.deleted", { term }))) {
    emit("deleted", id);
  }
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('terminologies.deleteTitle', { term: item?.term ?? '' })"
    :confirm-phrase="
      t('terminologies.deleteConfirm', { term: item?.term ?? '' })
    "
    :persistent="isPending"
    @cancel="cancel"
    @close="cancel"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-500 dark:text-neutral-400">
      {{ t("terminologies.deleteWarning") }}
    </p>
  </ConfirmDialog>
</template>
