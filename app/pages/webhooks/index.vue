<script setup lang="ts">
import { Alert, Button, Card, Icon, Switch, Text } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import type {
  Webhook,
  WebhookDelivery,
} from "~/lib/api/schemas/parlance/v1/WebhookSchema";
import { formatHour, parseSchedule } from "~/lib/taskSchedule";
import { WEBHOOK_EVENTS, isSendingSoon } from "~/lib/webhooks";

const { t, locale } = useI18n();
const { can } = usePermission();
const { getErrorMessage, showError } = useErrorHelper();
const store = useWebhookStore();

const { data, isLoading, error, refetch } = useQuery({
  ...api.webhooks.list.use({}),
  // Follows the last delivery of each webhook while one is about to be sent.
  refetchInterval: (query) =>
    query.state.data?.webhooks?.some((hook) => isSendingSoon(hook.lastDelivery))
      ? 3000
      : false,
});
const webhooks = computed(() => data.value?.webhooks ?? []);

const formOpen = ref(false);
const editing = ref<Webhook>();
const deleting = ref<Webhook>();
const openDeliveryId = ref<string>();
// Webhooks whose deliveries are shown, by id.
const expanded = ref<Record<string, boolean>>({});

usePage(() => ({
  width: "wide",
  title: t("nav.webhooks"),
  description: t("webhooks.description"),
  showHeader: false,
  primaryAction: can.value("create_webhook")
    ? {
        content: t("webhooks.add"),
        icon: "plus",
        onClick: () => openForm(),
      }
    : undefined,
}));

function openForm(hook?: Webhook) {
  editing.value = hook;
  formOpen.value = true;
}

/** The events a webhook gets, in words, e.g. "Translations approved · Task run failed". */
function describeEvents(hook: Webhook) {
  return WEBHOOK_EVENTS.filter((event) => hook.events?.includes(event))
    .map((event) => t(`webhooks.event.${event}`))
    .join(" · ");
}

const weekdayFormat = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, { weekday: "long", timeZone: "UTC" }),
);

/** When the webhook sends, in words, e.g. "Daily digest at 09:00 UTC". */
function describeSchedule(hook: Webhook) {
  const schedule = parseSchedule(hook.schedule);
  const time = formatHour(schedule.hour);

  switch (schedule.preset) {
    case "hourly":
      return t("webhooks.describe.hourly");
    case "daily":
      return t("webhooks.describe.daily", { time });
    case "weekly":
      return t("webhooks.describe.weekly", {
        day: weekdayFormat.value.format(
          new Date(Date.UTC(2024, 0, 7 + schedule.weekday)),
        ),
        time,
      });
    case "custom":
      return t("webhooks.describe.custom", { cron: schedule.custom });
    default:
      return t("webhooks.describe.immediate");
  }
}

async function setEnabled(hook: Webhook, enabled: boolean) {
  if (!hook.id) return;

  try {
    await store.update.mutateAsync({ id: hook.id, enabled });
  } catch (error) {
    showError(error);
  }
}

// The last test of each webhook, shown under it.
const testResults = ref<Record<string, WebhookDelivery>>({});
const testing = ref<string>();

async function sendTest(hook: Webhook) {
  if (!hook.id || testing.value) return;
  testing.value = hook.id;

  try {
    const result = await store.test.mutateAsync({ id: hook.id });

    if (result.delivery) testResults.value[hook.id] = result.delivery;
  } catch (error) {
    showError(error);
  } finally {
    testing.value = undefined;
  }
}
</script>

<template>
  <div
    v-if="isLoading"
    class="flex items-center justify-center py-12 text-neutral-600"
  >
    {{ t("webhooks.loading") }}
  </div>

  <Alert v-else-if="error && !data" variant="danger" persistent>
    <p>{{ t("webhooks.listFailed", { error: getErrorMessage(error) }) }}</p>
    <Button ghost @click="() => refetch()">{{ t("common.tryAgain") }}</Button>
  </Alert>

  <Card v-else-if="!webhooks.length">
    <div class="space-y-1 py-6 text-center">
      <Text>{{ t("webhooks.empty") }}</Text>
      <Text muted size="sm">{{ t("webhooks.emptyHint") }}</Text>
    </div>
  </Card>

  <div v-else class="space-y-3">
    <Card v-for="hook in webhooks" :key="hook.id ?? ''">
      <div class="space-y-3">
        <div class="flex flex-wrap items-start gap-3">
          <div
            class="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-200"
          >
            <Icon name="webhooks-logo" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold">{{ hook.name }}</span>
              <span
                v-if="!hook.enabled"
                class="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] font-bold text-neutral-500 dark:bg-white/5 dark:text-neutral-400"
                >{{ t("webhooks.inactive") }}</span
              >
              <span
                v-if="hook.format && hook.format !== 'WEBHOOK_FORMAT_JSON'"
                class="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] font-bold text-neutral-600 dark:bg-white/10 dark:text-neutral-300"
                >{{ t(`webhooks.format.${hook.format}`) }}</span
              >
              <span
                v-if="hook.hasSecret"
                class="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] font-bold text-neutral-600 dark:bg-white/10 dark:text-neutral-300"
                >{{ t("webhooks.signed") }}</span
              >
            </div>
            <div
              class="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400"
            >
              {{ hook.url }}
            </div>
            <div class="text-xs text-neutral-500 dark:text-neutral-400">
              {{ describeEvents(hook) }}
            </div>
            <div class="text-xs text-neutral-500 dark:text-neutral-400">
              {{ describeSchedule(hook) }}
              <template v-if="hook.enabled && hook.nextDigestAt">
                · {{ t("webhooks.nextDigest") }}
                <RelativeTime :timestamp="hook.nextDigestAt" />
              </template>
              <template v-if="hook.collectedCount">
                ·
                {{
                  t(
                    "webhooks.collected",
                    { count: hook.collectedCount },
                    hook.collectedCount,
                  )
                }}
              </template>
            </div>
          </div>
          <!-- On phones the actions take a row of their own, lined up with the
               details, so those keep the card's width. -->
          <div class="flex items-center gap-2 max-sm:basis-full max-sm:pl-12">
            <Switch
              v-if="can('update_webhook')"
              dense
              :model-value="!!hook.enabled"
              :aria-label="t('webhooks.enableFor', { name: hook.name ?? '' })"
              :disabled="store.update.isPending"
              @update:model-value="setEnabled(hook, $event)"
            />
            <Button
              v-can="'update_webhook'"
              dense
              ghost
              :disabled="!!testing"
              @click="sendTest(hook)"
            >
              {{
                testing === hook.id ? t("webhooks.testing") : t("webhooks.test")
              }}
            </Button>
            <BaseActionButtons
              :edit-label="t('webhooks.editFor', { name: hook.name ?? '' })"
              :delete-label="t('webhooks.deleteFor', { name: hook.name ?? '' })"
              edit-permission="update_webhook"
              delete-permission="delete_webhook"
              @edit="openForm(hook)"
              @delete="deleting = hook"
            />
          </div>
        </div>

        <p
          v-if="hook.id && testResults[hook.id]"
          role="status"
          class="text-xs"
          :class="
            testResults[hook.id]?.status === 'WEBHOOK_DELIVERY_STATUS_SUCCEEDED'
              ? 'text-green-700 dark:text-green-300'
              : 'text-red-600 dark:text-rose-300'
          "
        >
          {{
            testResults[hook.id]?.status === "WEBHOOK_DELIVERY_STATUS_SUCCEEDED"
              ? t("webhooks.testOk", {
                  status: testResults[hook.id]?.responseStatus ?? 0,
                  ms: testResults[hook.id]?.durationMs ?? 0,
                })
              : t("webhooks.testFailed", {
                  error: testResults[hook.id]?.error ?? "",
                })
          }}
        </p>

        <div
          class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-neutral-200 pt-3 dark:border-neutral-800"
        >
          <template v-if="hook.lastDelivery">
            <span class="text-xs text-neutral-500 dark:text-neutral-400">{{
              t("webhooks.lastDelivery")
            }}</span>
            <WebhookDeliveryStatus :status="hook.lastDelivery.status" />
            <RelativeTime
              v-if="hook.lastDelivery.createdAt"
              class="text-xs text-neutral-500 dark:text-neutral-400"
              :timestamp="hook.lastDelivery.createdAt"
            />
            <!-- On phones the result, often an error, goes on a line of its own
                 below, rather than into a narrow column beside the button. -->
            <WebhookDeliveryResult
              :delivery="hook.lastDelivery"
              class="max-sm:order-last max-sm:basis-full sm:flex-1"
            />
          </template>
          <span
            v-else
            class="flex-1 text-xs text-neutral-500 dark:text-neutral-400"
          >
            {{ t("webhooks.neverDelivered") }}
          </span>
          <Button
            v-if="hook.id"
            class="ml-auto"
            dense
            ghost
            :aria-expanded="!!expanded[hook.id]"
            @click="expanded[hook.id] = !expanded[hook.id]"
          >
            {{
              expanded[hook.id]
                ? t("webhooks.hideDeliveries")
                : t("webhooks.showDeliveries")
            }}
          </Button>
        </div>

        <WebhookDeliveryList
          v-if="hook.id && expanded[hook.id]"
          :webhook-id="hook.id"
          @open="openDeliveryId = $event"
        />
      </div>
    </Card>
  </div>

  <WebhookFormDialog
    :open="formOpen"
    :item="editing"
    @close="formOpen = false"
  />
  <WebhookDeleteDialog
    :open="!!deleting"
    :item="deleting"
    @close="deleting = undefined"
  />
  <WebhookDeliveryDialog
    :delivery-id="openDeliveryId"
    @close="openDeliveryId = undefined"
    @open="openDeliveryId = $event"
  />
</template>
