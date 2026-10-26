<script setup lang="ts">
import { Checkbox, NumberInput, Select } from "@thkzt/eunoia";
import type { AiTranslateForm, Option } from "~/lib/taskForm";

// What a machine translation task fills: from which language, into which, and
// for which entries.
const props = defineProps<{
  localeOptions: Option[];
  scopeOptions: Option[];
  disabled?: boolean;
}>();

const form = defineModel<AiTranslateForm>({ required: true });
const { t } = useI18n();

const sourceOptions = computed(() => [
  { label: t("tasks.ai.defaultSource"), value: "" },
  ...props.localeOptions,
]);
const targetOptions = computed(() =>
  props.localeOptions.filter(
    (option) => option.value !== form.value.sourceLocaleId,
  ),
);
</script>

<template>
  <fieldset class="space-y-3">
    <legend class="mb-2 text-sm font-semibold">
      {{ t("tasks.ai.title") }}
    </legend>
    <div class="grid gap-3 sm:grid-cols-2">
      <Select
        v-model="form.sourceLocaleId"
        teleport-to="body"
        :options="sourceOptions"
        :disabled
        >{{ t("tasks.ai.source") }}</Select
      >
      <Select
        v-model="form.targetLocaleIds"
        teleport-to="body"
        multiple
        :options="targetOptions"
        :disabled
        :placeholder="t('tasks.allOtherLanguages')"
        >{{ t("tasks.ai.targets") }}</Select
      >
    </div>
    <Select
      v-model="form.scopeIds"
      teleport-to="body"
      multiple
      :options="scopeOptions"
      :disabled
      :placeholder="t('scopes.all')"
      >{{ t("scopes.title") }}</Select
    >
    <NumberInput
      v-model="form.maxPairs"
      :min="1"
      :max="5000"
      :disabled
      :helper="t('tasks.ai.maxPairsHelp')"
      >{{ t("tasks.ai.maxPairs") }}</NumberInput
    >
    <Checkbox
      v-model="form.applyTerminology"
      :disabled
      :helper="t('tasks.ai.applyTerminologyHelp')"
    >
      <template #description>{{ t("tasks.ai.applyTerminology") }}</template>
    </Checkbox>
    <Checkbox
      v-model="form.redoMachineDrafts"
      :disabled
      :helper="t('tasks.ai.redoHelp')"
    >
      <template #description>{{ t("tasks.ai.redo") }}</template>
    </Checkbox>
    <p class="text-xs text-neutral-500 dark:text-neutral-400">
      {{ t("tasks.ai.draftsNote") }}
    </p>
  </fieldset>
</template>
