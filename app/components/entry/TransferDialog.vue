<script setup lang="ts">
import { Dialog } from "@thkzt/eunoia";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

const props = defineProps<{
  open: boolean;
  action: "import" | "export";
  locales: Locale[];
}>();
const emit = defineEmits<{ close: [] }>();
const isPending = ref(false);
const formKey = ref(0);
const { t } = useI18n();

// Remount the form on every open so it starts from a clean state.
watch(
  () => props.open,
  (open) => {
    if (open) formKey.value++;
  },
);

function handleClose() {
  if (!isPending.value) emit("close");
}
</script>

<template>
  <Dialog
    :open
    :title="
      t(action === 'import' ? 'transfer.importTitle' : 'transfer.exportTitle')
    "
    :persistent="isPending"
    @close="handleClose"
  >
    <EntryTransferForm
      :key="`${action}-${formKey}`"
      v-model:pending="isPending"
      :action
      :locales
      cancelable
      @cancel="handleClose"
      @exported="emit('close')"
    />
  </Dialog>
</template>
