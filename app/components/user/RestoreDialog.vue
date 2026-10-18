<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { User } from "~/lib/api";

const props = defineProps<{
  open: boolean;
  item?: User;
}>();

const { restore } = useUserStore();
const { mutateAsync: restoreUser, isPending } = restore;

const { showSuccess, showError } = useErrorHelper();

async function handleSubmit() {
  if (!props.item) return;

  await restoreUser(
    {
      id: props.item.id,
    },
    {
      onSuccess: () => {
        showSuccess(`User ${props.item?.name} restored`);
      },
      onError: (error) => {
        showError(error);
      },
    },
  );

  handleClose();
}

const emit = defineEmits<{
  close: [];
}>();

function handleClose() {
  if (!isPending) {
    emit("close");
  }
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="`Restore user: ${props.item?.name}`"
    @cancel="handleClose"
    @close="handleClose"
    @confirm="handleSubmit"
  >
    <p class="text-sm text-neutral-700 dark:text-neutral-200">
      Are you sure you want to restore this user?
    </p>
  </ConfirmDialog>
</template>
