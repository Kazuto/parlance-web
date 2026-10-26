<script setup lang="ts">
import { Button, Checkbox, Dialog, Input, Select, Switch } from "@thkzt/eunoia";
import type {
  Webhook,
  WebhookEvent,
  WebhookFormat,
} from "~/lib/api/schemas/parlance/v1/WebhookSchema";
import {
  buildSchedule,
  parseSchedule,
  type ScheduleChoice,
} from "~/lib/taskSchedule";
import {
  WEBHOOK_EVENTS,
  WEBHOOK_FORMATS,
  formatForUrl,
  generateSecret,
} from "~/lib/webhooks";

// Without an item the dialog adds a webhook; with an item it edits it. The stored
// secret is never shown: it can only be replaced or removed.
const props = defineProps<{ open: boolean; item?: Webhook }>();
const emit = defineEmits<{ close: [] }>();

const form = ref({
  name: "",
  url: "",
  events: [] as WebhookEvent[],
  format: "WEBHOOK_FORMAT_JSON" as WebhookFormat,
  schedule: parseSchedule(""),
  secret: "",
  removeSecret: false,
  enabled: true,
});
// Typing a chat service's address picks its format, until a format is picked by
// hand. A saved webhook keeps its format.
const formatPicked = ref(false);
const store = useWebhookStore();
const isEdit = computed(() => !!props.item);
const { t } = useI18n();
const { showSuccess } = useErrorHelper();

const { error, isPending, submit, cancel } = useFormDialog({
  open: () => props.open,
  isPending: () => store.create.isPending || store.update.isPending,
  reset: () => {
    form.value = {
      name: props.item?.name ?? "",
      url: props.item?.url ?? "",
      // A new webhook starts with the event most receivers want.
      events: props.item
        ? [...(props.item.events ?? [])]
        : ["WEBHOOK_EVENT_TRANSLATIONS_APPROVED"],
      format: props.item?.format ?? "WEBHOOK_FORMAT_JSON",
      schedule: scheduleOf(props.item),
      secret: "",
      removeSecret: false,
      // The API leaves out false values, so a missing one means off; only a new
      // webhook starts on.
      enabled: props.item ? !!props.item.enabled : true,
    };
    formatPicked.value = !!props.item;
  },
  close: () => emit("close"),
});

// A digest is read during the day, so a new daily or weekly one goes out at 09:00.
function scheduleOf(item?: Webhook): ScheduleChoice {
  return item?.schedule
    ? parseSchedule(item.schedule)
    : { ...parseSchedule(""), hour: 9 };
}

const formatOptions = computed(() =>
  WEBHOOK_FORMATS.map((value) => ({
    value,
    label: t(`webhooks.format.${value}`),
  })),
);

watch(
  () => form.value.url,
  (url) => {
    if (!formatPicked.value) {
      form.value.format = formatForUrl(url.trim()) ?? "WEBHOOK_FORMAT_JSON";
    }
  },
);

function pickFormat(format: WebhookFormat) {
  form.value.format = format;
  formatPicked.value = true;
}

// An address whose service only takes another format, e.g. Discord's for JSON.
const expectedFormat = computed(() => {
  const format = formatForUrl(form.value.url.trim());

  return format && format !== form.value.format ? format : undefined;
});

function setEvent(event: WebhookEvent, on: boolean) {
  const others = form.value.events.filter((value) => value !== event);

  form.value.events = on ? [...others, event] : others;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function handleSubmit() {
  submit(async () => {
    const name = form.value.name.trim();
    const url = form.value.url.trim();

    if (!name || !isHttpUrl(url)) {
      error.value = t("common.nameUrlRequired");

      return false;
    }

    // Listed in the form's order, whichever order they were ticked in.
    const events = WEBHOOK_EVENTS.filter((event) =>
      form.value.events.includes(event),
    );

    if (!events.length) {
      error.value = t("webhooks.eventsRequired");

      return false;
    }

    const schedule = buildSchedule(form.value.schedule);

    if (form.value.schedule.preset === "custom" && !schedule) {
      error.value = t("schedule.customRequired");

      return false;
    }

    const input = {
      name,
      url,
      enabled: form.value.enabled,
      format: form.value.format,
      schedule,
    };

    if (props.item?.id) {
      // Only a typed secret replaces the stored one; removing sends an empty one.
      const secret = form.value.removeSecret
        ? ""
        : form.value.secret.trim() || undefined;

      await store.update.mutateAsync({
        id: props.item.id,
        ...input,
        events: { events },
        secret,
      });
      showSuccess(t("webhooks.updated", { name }));
    } else {
      await store.create.mutateAsync({
        ...input,
        events,
        secret: form.value.secret.trim(),
      });
      showSuccess(t("webhooks.created", { name }));
    }
  });
}
</script>

<template>
  <Dialog
    :open
    :title="t(isEdit ? 'webhooks.edit' : 'webhooks.add')"
    :persistent="isPending"
    @close="cancel"
  >
    <form class="space-y-6" @submit.prevent="handleSubmit">
      <div class="space-y-4">
        <Input
          v-model="form.name"
          required
          :disabled="isPending"
          :placeholder="t('webhooks.namePlaceholder')"
        >
          {{ t("common.name") }}
        </Input>
        <Input
          v-model="form.url"
          required
          type="url"
          :disabled="isPending"
          placeholder="https://ci.example.com/hooks/parlance"
          :helper="t('webhooks.urlHelp')"
        >
          {{ t("webhooks.url") }}
        </Input>
      </div>

      <div class="space-y-1">
        <Select
          teleport-to="body"
          :model-value="form.format"
          :options="formatOptions"
          :disabled="isPending"
          @update:model-value="pickFormat($event as WebhookFormat)"
          >{{ t("common.format") }}</Select
        >
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t(`webhooks.formatHelp.${form.format}`) }}
        </p>
        <p
          v-if="expectedFormat"
          role="status"
          class="text-xs text-yellow-700 dark:text-amber-300"
        >
          {{
            t("webhooks.formatMismatch", {
              format: t(`webhooks.format.${expectedFormat}`),
            })
          }}
        </p>
      </div>

      <fieldset class="space-y-3">
        <legend class="mb-2 text-sm font-semibold">
          {{ t("webhooks.events") }}
        </legend>
        <Checkbox
          v-for="event in WEBHOOK_EVENTS"
          :key="event"
          :model-value="form.events.includes(event)"
          :disabled="isPending"
          :helper="t(`webhooks.eventHelp.${event}`)"
          @update:model-value="setEvent(event, !!$event)"
        >
          <template #description>{{ t(`webhooks.event.${event}`) }}</template>
        </Checkbox>
      </fieldset>

      <WebhookScheduleFields v-model="form.schedule" :disabled="isPending" />

      <div class="space-y-2">
        <Input
          v-model="form.secret"
          autocomplete="off"
          class="font-mono"
          :disabled="isPending || form.removeSecret"
          :placeholder="item?.hasSecret ? t('webhooks.secretKept') : undefined"
          :helper="t('webhooks.secretHelp')"
        >
          {{ t("webhooks.secret") }}
        </Input>
        <div class="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            dense
            ghost
            :disabled="isPending || form.removeSecret"
            @click="form.secret = generateSecret()"
          >
            {{ t("webhooks.generateSecret") }}
          </Button>
          <Checkbox
            v-if="item?.hasSecret"
            v-model="form.removeSecret"
            :disabled="isPending"
          >
            <template #description>
              {{ t("common.removeSavedSecret") }}
            </template>
          </Checkbox>
        </div>
      </div>

      <div class="space-y-1">
        <Switch v-model="form.enabled" :disabled="isPending">
          {{ t("webhooks.enabled") }}
        </Switch>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t("webhooks.enabledHelp") }}
        </p>
      </div>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="isPending" @click="cancel">
          {{ t("common.cancel") }}
        </Button>
        <Button primary :disabled="isPending" @click="handleSubmit">
          {{
            isPending
              ? t(isEdit ? "common.saving" : "common.creating")
              : t(isEdit ? "common.save" : "webhooks.add")
          }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
