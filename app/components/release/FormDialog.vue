<script setup lang="ts">
import {
  Button,
  DatePicker,
  Dialog,
  Input,
  Textarea,
  TimePicker,
  useTypingPlaceholder,
} from "@thkzt/eunoia";
import type { Release } from "~/lib/api/schemas/parlance/v1/ReleaseSchema";

// Without an item the dialog creates a release; with an item it edits it.
const props = defineProps<{ open: boolean; item?: Release }>();
const emit = defineEmits<{ close: [] }>();

// A picked day goes out at this time unless another is set.
const DEFAULT_TIME = "09:00";

const name = ref("");
const description = ref("");
// The day and time it goes out, in the browser's time zone; no day holds the
// entries until the release is published by hand.
const day = ref<Date | null>(null);
const time = ref(DEFAULT_TIME);
const releaseStore = useReleaseStore();
const isEdit = computed(() => !!props.item);
// A release that went out keeps its date.
const released = computed(() => !!props.item?.releasedAt);
const releaseDate = useReleaseDate();
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const { t } = useI18n();
const { showSuccess } = useErrorHelper();
const { placeholder: namePlaceholder } = useTypingPlaceholder([
  "Spring launch",
  "Checkout redesign",
  "Version 2.0",
  "Black Friday",
]);

const pad = (value: number) => String(value).padStart(2, "0");

const { error, isPending, submit, cancel } = useFormDialog({
  open: () => props.open,
  isPending: () =>
    releaseStore.create.isPending || releaseStore.update.isPending,
  reset: () => {
    const at = props.item?.releaseAt ? new Date(props.item.releaseAt) : null;

    name.value = props.item?.name ?? "";
    description.value = props.item?.description ?? "";
    day.value = at
      ? new Date(at.getFullYear(), at.getMonth(), at.getDate())
      : null;
    time.value = at
      ? `${pad(at.getHours())}:${pad(at.getMinutes())}`
      : DEFAULT_TIME;
  },
  close: () => emit("close"),
});

/** The picked day and time as RFC 3339, or undefined without a day. */
function releaseAt() {
  if (!day.value) return undefined;

  const [hours = 0, minutes = 0] = (time.value || DEFAULT_TIME)
    .split(":")
    .map(Number);

  return new Date(
    day.value.getFullYear(),
    day.value.getMonth(),
    day.value.getDate(),
    hours,
    minutes,
  ).toISOString();
}

function handleSubmit() {
  submit(async () => {
    const trimmed = name.value.trim();

    if (!trimmed) {
      error.value = t("releases.nameRequired");

      return false;
    }

    const at = releaseAt();
    const input = { name: trimmed, description: description.value.trim() };

    if (props.item) {
      if (!props.item.id) return false;

      // The date only changes while the release is pending.
      const date = released.value
        ? {}
        : at
          ? { releaseAt: at }
          : props.item.releaseAt
            ? { clearReleaseAt: true }
            : {};

      await releaseStore.update.mutateAsync({
        id: props.item.id,
        ...input,
        ...date,
      });
      showSuccess(t("releases.updated", { name: trimmed }));
    } else {
      await releaseStore.create.mutateAsync({
        ...input,
        ...(at ? { releaseAt: at } : {}),
      });
      showSuccess(t("releases.created", { name: trimmed }));
    }
  });
}
</script>

<template>
  <Dialog
    :open
    :title="t(isEdit ? 'releases.edit' : 'releases.create')"
    :persistent="isPending"
    @close="cancel"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="name"
        required
        :disabled="isPending"
        :placeholder="namePlaceholder"
      >
        {{ t("common.name") }}
      </Input>
      <Textarea
        v-model="description"
        :disabled="isPending"
        :placeholder="t('releases.descriptionPlaceholder')"
      >
        {{ t("common.description") }}
      </Textarea>
      <p
        v-if="released && item?.releasedAt"
        class="text-sm text-neutral-500 dark:text-neutral-400"
      >
        {{
          t("releases.wentOut", {
            date: releaseDate({ releaseAt: item.releasedAt }),
          })
        }}
      </p>
      <div v-else class="space-y-1">
        <!-- The time shows from the start, but only counts once a day is picked. -->
        <div class="flex flex-wrap items-end gap-3">
          <div class="min-w-48 flex-1">
            <DatePicker
              v-model="day"
              class="w-full"
              teleport-to="body"
              :disabled="isPending"
              :placeholder="t('releases.notScheduled')"
              >{{ t("releases.date") }}</DatePicker
            >
          </div>
          <div class="w-32">
            <TimePicker
              v-model="time"
              class="w-full"
              teleport-to="body"
              :disabled="isPending || !day"
              >{{ t("releases.time") }}</TimePicker
            >
          </div>
          <Button
            v-if="day"
            type="button"
            ghost
            :disabled="isPending"
            @click="day = null"
          >
            {{ t("releases.clearDate") }}
          </Button>
        </div>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          {{
            day
              ? t("releases.dateHelp", { zone: timeZone })
              : t("releases.noDateHelp")
          }}
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
              : t(isEdit ? "common.save" : "releases.create")
          }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
