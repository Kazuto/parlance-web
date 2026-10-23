<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Webhook } from "~/lib/api/schemas/parlance/v1/WebhookSchema";

const props = defineProps<{ open: boolean; item?: Webhook }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const store = useWebhookStore();
const { isPending, run, cancel } = useConfirmMutation(
  () => store.destroy,
  () => emit("close"),
);

function handleConfirm() {
  if (!props.item?.id) return;
  run(
    { id: props.item.id },
    t("webhooks.deleted", { name: props.item.name ?? "" }),
  );
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('webhooks.deleteTitle', { name: item?.name ?? '' })"
    :persistent="isPending"
    @cancel="cancel"
    @close="cancel"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-500 dark:text-neutral-400">
      {{ t("webhooks.deleteConfirm") }}
    </p>
  </ConfirmDialog>
</template>
