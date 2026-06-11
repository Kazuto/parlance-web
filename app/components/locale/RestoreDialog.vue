<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Locale } from "~/lib/api/schemas/LocaleSchema";

const props = defineProps<{
  open: boolean;
  item?: Locale;
}>();

const { restore } = useLocaleStore();
const { mutateAsync: restoreLocale, isPending } = restore;

async function handleSubmit() {
  if (!props.item) return;

  await restoreLocale({
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
    :title="`Restore Locale: ${props.item?.name}`"
    @cancel="handleClose"
    @close="handleClose"
    @confirm="handleSubmit"
  >
    <p class="text-sm text-neutral-500">
      Are you sure you want to restore this locale?
    </p>
  </ConfirmDialog>
</template>
