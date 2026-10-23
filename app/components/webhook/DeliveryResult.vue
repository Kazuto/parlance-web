<script setup lang="ts">
import type { WebhookDelivery } from "~/lib/api/schemas/parlance/v1/WebhookSchema";

// How a delivery went, in one line: the answer, why it failed, or when it is
// tried next.
defineProps<{ delivery: WebhookDelivery }>();

const { t } = useI18n();
</script>

<template>
  <span class="min-w-0 text-xs text-neutral-500 dark:text-neutral-400">
    <template v-if="delivery.status === 'WEBHOOK_DELIVERY_STATUS_SUCCEEDED'">{{
      t("webhooks.answered", {
        status: delivery.responseStatus ?? 0,
        ms: delivery.durationMs ?? 0,
      })
    }}</template>
    <template v-else>
      <span v-if="delivery.error" class="text-red-600 dark:text-rose-300">{{
        delivery.error
      }}</span>
      <template
        v-if="
          delivery.status === 'WEBHOOK_DELIVERY_STATUS_PENDING' &&
          delivery.attempts &&
          delivery.nextAttemptAt
        "
      >
        · {{ t("webhooks.retrying") }}
        <RelativeTime :timestamp="delivery.nextAttemptAt" />
      </template>
    </template>
  </span>
</template>
