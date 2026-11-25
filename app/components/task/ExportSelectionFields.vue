<script setup lang="ts">
import { Button, Checkbox, Input, Select } from "@thkzt/eunoia";
import type { ExportFormat } from "~/lib/api/schemas/parlance/v1/TaskSchema";
import type { ExportSelectionForm, Option } from "~/lib/taskForm";

// What an export holds: its files, languages, scopes, tags and drafts, as git and
// S3 exports share them.
const props = defineProps<{
  localeOptions: Option[];
  scopeOptions: (Option & { exportFormat?: ExportFormat })[];
  /** The chosen scopes' tags */
  tagOptions?: Option[];
  /** Where each format's files go unless changed */
  defaultPaths: Record<string, string>;
  pathHelp: string;
  disabled?: boolean;
}>();

const form = defineModel<ExportSelectionForm>({ required: true });

const { t } = useI18n();

const formatOptions = computed(() =>
  (
    ["EXPORT_FORMAT_JSON", "EXPORT_FORMAT_PHP", "EXPORT_FORMAT_PO"] as const
  ).map((value) => ({ value, label: t(`tasks.git.format.${value}`) })),
);

// A new file takes a format not used yet, the selected scopes' defaults first.
function addFile() {
  const used = new Set(form.value.files.map((file) => file.format));
  const scopeFormats = props.scopeOptions
    .filter((scope) => form.value.scopeIds.includes(scope.value))
    .flatMap((scope) => (scope.exportFormat ? [scope.exportFormat] : []));
  const format =
    [
      ...scopeFormats,
      ...formatOptions.value.map((option) => option.value),
    ].find((value) => !used.has(value)) ?? "EXPORT_FORMAT_JSON";

  form.value.files.push({ format, path: props.defaultPaths[format] ?? "" });
}

// Picking another format swaps in its usual path, unless one was typed.
function setFormat(index: number, format: ExportFormat) {
  const file = form.value.files[index];

  if (!file) return;

  if (!file.path || file.path === props.defaultPaths[String(file.format)]) {
    file.path = props.defaultPaths[String(format)] ?? "";
  }

  file.format = format;
}
</script>

<template>
  <div class="space-y-2">
    <div class="text-sm font-medium">{{ t("tasks.git.files") }}</div>
    <div
      v-for="(file, index) in form.files"
      :key="index"
      class="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-start gap-2"
    >
      <Select
        teleport-to="body"
        :model-value="file.format"
        :options="formatOptions"
        :disabled
        :aria-label="t('common.format')"
        @update:model-value="setFormat(index, $event as ExportFormat)"
      />
      <Input
        v-model="file.path"
        :disabled
        :aria-label="t('tasks.git.path')"
        :placeholder="defaultPaths.EXPORT_FORMAT_JSON"
        class="font-mono"
      />
      <BaseIconButton
        icon="trash"
        :label="t('tasks.git.removeFile')"
        :disabled="disabled || form.files.length === 1"
        @click="form.files.splice(index, 1)"
      />
    </div>
    <p class="text-xs text-neutral-500 dark:text-neutral-400">
      {{ pathHelp }}
    </p>
    <Button
      type="button"
      dense
      ghost
      :disabled="disabled || form.files.length >= 10"
      @click="addFile"
    >
      {{ t("tasks.git.addFile") }}
    </Button>
  </div>

  <div class="grid gap-3 sm:grid-cols-2">
    <Select
      v-model="form.localeIds"
      teleport-to="body"
      multiple
      :options="localeOptions"
      :disabled
      :placeholder="t('common.allLanguages')"
      >{{ t("common.languages") }}</Select
    >
    <Select
      v-model="form.scopeIds"
      teleport-to="body"
      multiple
      :options="scopeOptions"
      :disabled
      :placeholder="t('scopes.all')"
      >{{ t("nav.scopes") }}</Select
    >
  </div>
  <div v-if="form.scopeIds.length && tagOptions?.length" class="space-y-1">
    <Select
      v-model="form.tagIds"
      teleport-to="body"
      multiple
      :options="tagOptions"
      :disabled
      :placeholder="t('tags.select')"
      >{{ t("tags.title") }}</Select
    >
    <p class="text-xs text-neutral-500 dark:text-neutral-400">
      {{ t("tags.exportHelp") }}
    </p>
  </div>
  <Checkbox
    v-model="form.includeDrafts"
    :disabled
    :helper="t('transfer.includeDraftsHelp')"
  >
    <template #description>{{ t("transfer.includeDrafts") }}</template>
  </Checkbox>
</template>
