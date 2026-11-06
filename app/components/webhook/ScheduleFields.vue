<script setup lang="ts">
import { Input, Select } from "@thkzt/eunoia";
import type { ScheduleChoice } from "~/lib/taskSchedule";

// When a webhook sends: each event right away, or what it collected as one digest
// on a schedule.
defineProps<{ disabled?: boolean }>();

const schedule = defineModel<ScheduleChoice>({ required: true });

const { t } = useI18n();
const { hourOptions, weekdayOptions } = useScheduleOptions();

const presetOptions = computed(() =>
  (["none", "hourly", "daily", "weekly", "custom"] as const).map((value) => ({
    value,
    label: t(`webhooks.schedule.${value}`),
  })),
);
</script>

<template>
  <div class="space-y-1">
    <div class="space-y-3">
      <Select
        v-model="schedule.preset"
        teleport-to="body"
        :options="presetOptions"
        :disabled
        >{{ t("webhooks.schedule.label") }}</Select
      >
      <div
        v-if="schedule.preset === 'daily' || schedule.preset === 'weekly'"
        class="grid gap-3 sm:grid-cols-2"
      >
        <Select
          v-if="schedule.preset === 'weekly'"
          v-model="schedule.weekday"
          teleport-to="body"
          :options="weekdayOptions"
          :disabled
          >{{ t("schedule.weekday") }}</Select
        >
        <Select
          v-model="schedule.hour"
          teleport-to="body"
          :options="hourOptions"
          :disabled
          >{{ t("schedule.time") }}</Select
        >
      </div>
      <Input
        v-if="schedule.preset === 'custom'"
        v-model="schedule.custom"
        :disabled
        placeholder="0 9,17 * * 1-5"
        :helper="t('schedule.customHelp')"
        >{{ t("schedule.cron") }}</Input
      >
    </div>
    <p class="text-xs text-neutral-500 dark:text-neutral-400">
      {{
        t(
          schedule.preset === "none"
            ? "webhooks.schedule.noneHelp"
            : "webhooks.schedule.digestHelp",
        )
      }}
    </p>
  </div>
</template>
