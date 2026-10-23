<script setup lang="ts">
import { Button, Dialog } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { formatBody, isSendingSoon } from "~/lib/webhooks";

// One delivery with what was sent and what came back. Sending it again opens the
// new delivery.
const props = defineProps<{ deliveryId?: string }>();
const emit = defineEmits<{ close: []; open: [deliveryId: string] }>();

const { t } = useI18n();
const { can } = usePermission();
const { showError, showSuccess } = useErrorHelper();
const store = useWebhookStore();

const deliveryId = computed(() => props.deliveryId ?? "");
const options = api.webhooks.getDelivery.use({ id: deliveryId });
const { data } = useQuery({
  ...options,
  enabled: computed(() => toValue(options.enabled) && !!props.deliveryId),
  refetchInterval: (query) =>
    isSendingSoon(query.state.data?.delivery) ? 2000 : false,
});
const delivery = computed(() => data.value?.delivery);

async function redeliver() {
  if (!delivery.value?.id) return;

  try {
    const result = await store.redeliver.mutateAsync({ id: delivery.value.id });

    showSuccess(t("webhooks.redelivered"));

    if (result.delivery?.id) emit("open", result.delivery.id);
  } catch (error) {
    showError(error);
  }
}
</script>

<template>
  <Dialog
    :open="!!deliveryId"
    :title="t('webhooks.deliveryTitle')"
    @close="emit('close')"
  >
    <div v-if="delivery" class="space-y-4">
      <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
        <dt class="text-neutral-500 dark:text-neutral-400">
          {{ t("common.status") }}
        </dt>
        <dd><WebhookDeliveryStatus :status="delivery.status" /></dd>
        <dt class="text-neutral-500 dark:text-neutral-400">
          {{ t("webhooks.eventLabel") }}
        </dt>
        <dd>{{ t(`webhooks.event.${delivery.event}`) }}</dd>
        <template v-if="delivery.createdAt">
          <dt class="text-neutral-500 dark:text-neutral-400">
            {{ t("common.created") }}
          </dt>
          <dd><RelativeTime :timestamp="delivery.createdAt" /></dd>
        </template>
        <dt class="text-neutral-500 dark:text-neutral-400">
          {{ t("webhooks.attempts") }}
        </dt>
        <dd>
          {{ delivery.attempts ?? 0 }}
          <template v-if="delivery.lastAttemptAt">
            · {{ t("webhooks.lastAttempt") }}
            <RelativeTime :timestamp="delivery.lastAttemptAt" />
          </template>
        </dd>
        <template
          v-if="
            delivery.status === 'WEBHOOK_DELIVERY_STATUS_PENDING' &&
            delivery.nextAttemptAt
          "
        >
          <dt class="text-neutral-500 dark:text-neutral-400">
            {{ t("webhooks.nextAttempt") }}
          </dt>
          <dd><RelativeTime :timestamp="delivery.nextAttemptAt" /></dd>
        </template>
        <template v-if="delivery.responseStatus">
          <dt class="text-neutral-500 dark:text-neutral-400">
            {{ t("webhooks.response") }}
          </dt>
          <dd>
            {{
              t("webhooks.answered", {
                status: delivery.responseStatus,
                ms: delivery.durationMs ?? 0,
              })
            }}
          </dd>
        </template>
        <template v-if="delivery.error">
          <dt class="text-neutral-500 dark:text-neutral-400">
            {{ t("webhooks.error") }}
          </dt>
          <dd class="text-red-600 dark:text-rose-300">{{ delivery.error }}</dd>
        </template>
      </dl>

      <div class="space-y-1">
        <div class="text-sm font-medium">{{ t("webhooks.payload") }}</div>
        <pre
          class="max-h-80 overflow-auto rounded-xl bg-neutral-100 p-3 font-mono text-xs leading-5 whitespace-pre-wrap dark:bg-white/5"
          >{{ formatBody(delivery.payload ?? "") }}</pre
        >
      </div>

      <div v-if="delivery.responseBody" class="space-y-1">
        <div class="text-sm font-medium">{{ t("webhooks.responseBody") }}</div>
        <pre
          class="max-h-60 overflow-auto rounded-xl bg-neutral-100 p-3 font-mono text-xs leading-5 whitespace-pre-wrap dark:bg-white/5"
          >{{ formatBody(delivery.responseBody) }}</pre
        >
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button
          v-if="delivery && can('update_webhook')"
          type="button"
          ghost
          :disabled="store.redeliver.isPending"
          @click="redeliver"
        >
          {{
            store.redeliver.isPending
              ? t("webhooks.redelivering")
              : t("webhooks.redeliver")
          }}
        </Button>
        <Button type="button" @click="emit('close')">
          {{ t("common.close") }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
