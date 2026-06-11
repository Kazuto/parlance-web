<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Locale } from "~/lib/api/schemas/LocaleSchema";

const props = defineProps<{
  open: boolean;
  item?: Locale;
}>();

const { destroy } = useLocaleStore();
const { mutateAsync: destroyLocale, isPending } = destroy;

const toast = useToast();

async function handleSubmit() {
  if (!props.item) return;

  await destroyLocale(
    {
      id: props.item.id,
    },
    {
      onSuccess: () => {
        toast.add(`Locale ${props.item?.name} deleted`, { variant: "success" });
      },
      onError: () => {
        toast.add(`Failed to delete locale: ${props.item?.name}`, {
          variant: "danger",
        });
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
    :title="`Delete Locale: ${props.item?.name}`"
    @cancel="handleClose"
    @close="handleClose"
    @confirm="handleSubmit"
  >
    <p class="text-sm text-neutral-500">
      Are you sure you want to delete this locale?
    </p>
  </ConfirmDialog>
</template>
