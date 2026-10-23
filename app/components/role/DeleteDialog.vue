<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Role } from "~/lib/api/schemas/parlance/v1/RoleSchema";

const props = defineProps<{ open: boolean; item?: Role }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const roleStore = useRoleStore();
const { isPending, run, cancel } = useConfirmMutation(
  () => roleStore.destroy,
  () => emit("close"),
);

function handleConfirm() {
  if (!props.item?.id) return;
  run({ id: props.item.id }, t("roles.deleted", { name: props.item.name }));
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('roles.deleteTitle', { name: item?.name ?? '' })"
    :confirm-phrase="
      t('common.deleteConfirmPhrase', { name: item?.name ?? '' })
    "
    :persistent="isPending"
    @cancel="cancel"
    @close="cancel"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-700 dark:text-neutral-200">
      {{ t("roles.deleteConfirm") }}
    </p>
  </ConfirmDialog>
</template>
