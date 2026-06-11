<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Locale } from "~/lib/api/schemas/LocaleSchema";

const props = defineProps<{
  open: boolean;
  item?: Locale;
}>();

const { destroy } = useLocaleStore();
const { mutateAsync: destroyLocale, isPending } = destroy;

async function handleSubmit() {
  if (!props.item) return;

  await destroyLocale({
    id: props.item.id,
  });

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
    confirm-phrase="Delete Locale"
    @cancel="handleClose"
    @close="handleClose"
    @confirm="handleSubmit"
  >
    <p class="text-sm text-neutral-500">
      Are you sure you want to delete this locale?
    </p>
  </ConfirmDialog>
</template>
