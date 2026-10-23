<script setup lang="ts">
import { Button, Dialog } from "@thkzt/eunoia";

// Confirms saving every unsaved change, including those out of sight.
defineProps<{
  open: boolean;
  title: string;
  message: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{ close: []; confirm: [] }>();
const { t } = useI18n();
</script>

<template>
  <Dialog :open :title @close="emit('close')">
    <p class="text-sm text-neutral-500 dark:text-neutral-400">
      {{ message }}
    </p>
    <div class="mt-6 flex justify-end gap-3">
      <Button type="button" ghost @click="emit('close')">{{
        t("common.cancel")
      }}</Button>
      <Button type="button" primary :disabled @click="emit('confirm')">{{
        t("common.saveAll")
      }}</Button>
    </div>
  </Dialog>
</template>
