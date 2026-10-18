<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { User } from "~/lib/api";

const props = defineProps<{
  open: boolean;
  item?: User;
}>();

const { destroy } = useUserStore();
const { mutateAsync: destroyUser, isPending } = destroy;

const { showSuccess, showError } = useErrorHelper();

async function handleSubmit() {
  if (!props.item) return;

  await destroyUser(
    {
      id: props.item.id,
    },
    {
      onSuccess: () => {
        showSuccess(`User ${props.item?.name} deleted`);
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
    :title="`Delete User: ${props.item?.name}`"
    :confirm-phrase="`Delete ${props.item?.name}`"
    @cancel="handleClose"
    @close="handleClose"
    @confirm="handleSubmit"
  >
    <p class="text-sm text-neutral-700 dark:text-neutral-200">
      Are you sure you want to delete this user?
    </p>
  </ConfirmDialog>
</template>
