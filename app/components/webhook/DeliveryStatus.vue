<script setup lang="ts">
import type { WebhookDeliveryStatus } from "~/lib/api/schemas/parlance/v1/WebhookSchema";

// A delivery's state as a small colored chip.
const props = defineProps<{ status?: WebhookDeliveryStatus | null }>();
const { t } = useI18n();

const styles: Record<string, string> = {
  WEBHOOK_DELIVERY_STATUS_PENDING:
    "bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300",
  WEBHOOK_DELIVERY_STATUS_SUCCEEDED:
    "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-200",
  WEBHOOK_DELIVERY_STATUS_FAILED:
    "bg-red-100 text-red-700 dark:bg-rose-400/15 dark:text-rose-200",
  WEBHOOK_DELIVERY_STATUS_COLLECTED:
    "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-200",
};
const status = computed(() =>
  String(props.status ?? "WEBHOOK_DELIVERY_STATUS_PENDING"),
);
</script>

<template>
  <span
    class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap"
    :class="styles[status]"
  >
    {{ t(`webhooks.status.${status}`) }}
  </span>
</template>
