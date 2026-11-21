<script setup lang="ts">
import { Button, Dialog } from "@thkzt/eunoia";

// Asks before confirming that the ticked entries' outdated translations still fit,
// as nobody checks them one by one against the changed default text.
defineProps<{
  open: boolean;
  /** How many entries are ticked. */
  count: number;
  /** The confirmation is on its way. */
  pending?: boolean;
}>();

const emit = defineEmits<{ close: []; confirm: [] }>();
const { t } = useI18n();
</script>

<template>
  <Dialog
    :open
    :title="t('review.confirmOutdatedTitle')"
    :persistent="pending"
    @close="emit('close')"
  >
    <p class="text-sm text-neutral-500 dark:text-neutral-400">
      {{ t("review.confirmOutdatedMessage", { count }, count) }}
    </p>
    <template #footer>
      <div class="flex justify-end gap-3">
        <Button type="button" ghost :disabled="pending" @click="emit('close')">
          {{ t("common.cancel") }}
        </Button>
        <Button
          type="button"
          primary
          :disabled="pending"
          @click="emit('confirm')"
        >
          {{ t("review.confirmOutdatedAction") }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
