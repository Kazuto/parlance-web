<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Task } from "~/lib/api/schemas/parlance/v1/TaskSchema";

const props = defineProps<{ open: boolean; item?: Task }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const store = useTaskStore();
const { isPending, run, cancel } = useConfirmMutation(
  () => store.destroy,
  () => emit("close"),
);

function handleConfirm() {
  if (!props.item?.id) return;
  run(
    { id: props.item.id },
    t("tasks.deleted", { name: props.item.name ?? "" }),
  );
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('tasks.deleteTitle', { name: item?.name ?? '' })"
    :persistent="isPending"
    @cancel="cancel"
    @close="cancel"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-500 dark:text-neutral-400">
      {{ t("tasks.deleteConfirm") }}
    </p>
  </ConfirmDialog>
</template>
