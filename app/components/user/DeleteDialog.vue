<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { User } from "~/lib/api";

const props = defineProps<{ open: boolean; item?: User }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const userStore = useUserStore();
const { isPending, run, cancel } = useConfirmMutation(
  () => userStore.destroy,
  () => emit("close"),
);

function handleConfirm() {
  if (!props.item?.id) return;
  run({ id: props.item.id }, t("users.deleted", { name: props.item.name }));
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('users.deleteTitle', { name: item?.name ?? '' })"
    :confirm-phrase="
      t('common.deleteConfirmPhrase', { name: item?.name ?? '' })
    "
    :persistent="isPending"
    @cancel="cancel"
    @close="cancel"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-700 dark:text-neutral-200">
      {{ t("users.deleteConfirm") }}
    </p>
  </ConfirmDialog>
</template>
