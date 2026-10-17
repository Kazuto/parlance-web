<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Role } from "~/lib/api/schemas/parlance/v1/RoleSchema";

const props = defineProps<{
  open: boolean;
  role?: Role;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const toast = useToast();
const { destroy } = useRoleStore();
const { mutateAsync: destroyRole, isPending } = destroy;

async function handleSubmit() {
  if (!props.role) return;

  await destroyRole(
    {
      id: props.role.id,
    },
    {
      onSuccess: () => {
        toast.add(t("roles.deleted", { name: props.role?.name }), {
          variant: "success",
        });
      },
      onError: () => {
        toast.add(t("roles.deleteFailed", { name: props.role?.name }), {
          variant: "danger",
        });
      },
    },
  );

  handleClose();
}

function handleClose() {
  if (!isPending) {
    emit("close");
  }
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('roles.deleteTitle', { name: role?.name || '' })"
    :confirm-phrase="`Delete ${role?.name}`"
    @cancel="handleClose"
    @close="handleClose"
    @confirm="handleSubmit"
  >
    <p class="text-sm text-neutral-700 dark:text-neutral-200">
      {{ t("roles.deleteConfirm") }}
    </p>
  </ConfirmDialog>
</template>
