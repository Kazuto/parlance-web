<script setup lang="ts">
import { Pagination } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { isSendingSoon } from "~/lib/webhooks";

// A webhook's deliveries, newest first. While one is about to be sent, the list
// refreshes.
const props = defineProps<{ webhookId: string }>();
const emit = defineEmits<{ open: [deliveryId: string] }>();

const { t } = useI18n();
const page = ref(1);
const webhookId = computed(() => props.webhookId);
const { data, isFetching } = useQuery({
  ...api.webhooks.deliveries.use({
    webhookId,
    pagination: { page, perPage: 10 },
  }),
  refetchInterval: (query) =>
    query.state.data?.deliveries?.some(isSendingSoon) ? 3000 : false,
});
const deliveries = computed(() => data.value?.deliveries ?? []);
const totalPages = computed(() => data.value?.pagination?.totalPages ?? 1);

watch(webhookId, () => (page.value = 1));
</script>

<template>
  <div class="space-y-2">
    <p
      v-if="!deliveries.length && !isFetching"
      class="text-sm text-neutral-500 dark:text-neutral-400"
    >
      {{ t("webhooks.noDeliveries") }}
    </p>
    <ul v-else class="divide-y divide-neutral-200 dark:divide-neutral-800">
      <li v-for="delivery in deliveries" :key="delivery.id ?? ''">
        <button
          type="button"
          class="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 text-left hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none dark:hover:bg-white/5"
          @click="delivery.id && emit('open', delivery.id)"
        >
          <WebhookDeliveryStatus :status="delivery.status" />
          <span class="text-xs text-neutral-600 dark:text-neutral-300">{{
            t(`webhooks.event.${delivery.event}`)
          }}</span>
          <RelativeTime
            v-if="delivery.createdAt"
            class="text-xs text-neutral-500 dark:text-neutral-400"
            :timestamp="delivery.createdAt"
          />
          <WebhookDeliveryResult
            :delivery
            class="basis-full sm:basis-auto sm:flex-1"
          />
        </button>
      </li>
    </ul>
    <Pagination
      v-if="totalPages > 1"
      :current="page"
      :per-page="10"
      :total="totalPages"
      @update:current="page = $event"
    />
  </div>
</template>
