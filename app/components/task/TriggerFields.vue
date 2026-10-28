<script setup lang="ts">
import { Checkbox, Input, NumberInput, Select } from "@thkzt/eunoia";
import type { ScheduleChoice } from "~/lib/taskSchedule";

// When a task runs on its own: on a schedule and after approvals. Runs can
// always be started by hand too.
defineProps<{ disabled?: boolean }>();

const schedule = defineModel<ScheduleChoice>("schedule", { required: true });
const onApproval = defineModel<boolean>("onApproval", { required: true });
const delay = defineModel<number>("delay", { required: true });

const { t } = useI18n();
const { hourOptions, weekdayOptions } = useScheduleOptions();

const presetOptions = computed(() =>
  (["none", "hourly", "daily", "weekly", "custom"] as const).map((value) => ({
    value,
    label: t(`tasks.schedule.${value}`),
  })),
);
</script>

<template>
  <fieldset class="space-y-3">
    <legend class="mb-2 text-sm font-semibold">
      {{ t("tasks.triggers") }}
    </legend>
    <Select
      v-model="schedule.preset"
      teleport-to="body"
      :options="presetOptions"
      :disabled
      >{{ t("tasks.schedule.label") }}</Select
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
      placeholder="30 2 * * 1-5"
      :helper="t('schedule.customHelp')"
      >{{ t("schedule.cron") }}</Input
    >
    <Checkbox
      v-model="onApproval"
      :disabled
      :helper="t('tasks.onApprovalHelp')"
    >
      <template #description>{{ t("tasks.onApproval") }}</template>
    </Checkbox>
    <NumberInput
      v-if="onApproval"
      v-model="delay"
      :min="0"
      :max="1440"
      :disabled
      :helper="t('tasks.delayHelp')"
      >{{ t("tasks.delay") }}</NumberInput
    >
  </fieldset>
</template>
