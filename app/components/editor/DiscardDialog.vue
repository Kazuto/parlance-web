<script setup lang="ts">
import { Button, Dialog } from "@thkzt/eunoia";

// Confirms discarding unsaved changes that reach beyond the item on screen.
defineProps<{ open: boolean; count: number }>();
const emit = defineEmits<{ close: []; confirm: [] }>();
const { t } = useI18n();
</script>

<template>
  <Dialog :open :title="t('common.discardAllTitle')" @close="emit('close')">
    <p class="text-sm text-neutral-500 dark:text-neutral-400">
      {{ t("common.discardAllConfirm", { count }, count) }}
    </p>
    <template #footer>
      <div class="flex justify-end gap-3">
        <Button type="button" ghost @click="emit('close')">{{
          t("common.cancel")
        }}</Button>
        <Button type="button" destructive @click="emit('confirm')">{{
          t("common.discard")
        }}</Button>
      </div>
    </template>
  </Dialog>
</template>
