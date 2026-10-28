<script setup lang="ts">
import { Button, Checkbox, Input, Select } from "@thkzt/eunoia";
import type { ExportFormat } from "~/lib/api/schemas/parlance/v1/TaskSchema";
import {
  DEFAULT_PATHS,
  formToSettings,
  taskToForm,
  type GitExportForm,
  type Option,
} from "~/lib/taskForm";

// Where a git export goes and what it holds. The stored token is never shown:
// it can only be replaced or removed.
const props = defineProps<{
  /** The task being edited, whose saved token a check can use. */
  taskId?: string;
  hasToken?: boolean;
  localeOptions: Option[];
  scopeOptions: Option[];
  disabled?: boolean;
}>();

const form = defineModel<GitExportForm>({ required: true });
const token = defineModel<string>("token", { required: true });
const removeToken = defineModel<boolean>("removeToken", { required: true });

const { t } = useI18n();
const { showError } = useErrorHelper();
const store = useTaskStore();

const formatOptions = computed(() =>
  (
    ["EXPORT_FORMAT_JSON", "EXPORT_FORMAT_PHP", "EXPORT_FORMAT_PO"] as const
  ).map((value) => ({ value, label: t(`tasks.git.format.${value}`) })),
);

function addFile() {
  const used = new Set(form.value.files.map((file) => file.format));
  const format =
    formatOptions.value.find((option) => !used.has(option.value))?.value ??
    "EXPORT_FORMAT_JSON";

  form.value.files.push({ format, path: DEFAULT_PATHS[format] ?? "" });
}

// Picking another format swaps in its usual path, unless one was typed.
function setFormat(index: number, format: ExportFormat) {
  const file = form.value.files[index];

  if (!file) return;

  if (!file.path || file.path === DEFAULT_PATHS[String(file.format)]) {
    file.path = DEFAULT_PATHS[String(format)] ?? "";
  }

  file.format = format;
}

const check = ref<{ ok: boolean; error?: string }>();

watch(
  () => [form.value.apiUrl, form.value.repository, form.value.baseBranch],
  () => (check.value = undefined),
);

async function checkAccess() {
  check.value = undefined;

  // Unsaved settings are checked as they stand; the token falls back to the saved one.
  const settings = formToSettings({
    ...taskToForm(undefined, "TASK_TYPE_GIT_EXPORT"),
    git: form.value,
  });

  try {
    const result = await store.checkAccess.mutateAsync({
      id: props.taskId,
      gitExport: settings.gitExport,
      token:
        token.value || (props.hasToken && !removeToken.value ? undefined : ""),
    });

    check.value = { ok: !!result.ok, error: result.error ?? undefined };
  } catch (error) {
    showError(error);
  }
}
</script>

<template>
  <fieldset class="space-y-3">
    <legend class="mb-2 text-sm font-semibold">
      {{ t("tasks.git.title") }}
    </legend>
    <Input
      v-model="form.repository"
      required
      :disabled
      placeholder="acme/app"
      :helper="t('tasks.git.repositoryHelp')"
      >{{ t("tasks.git.repository") }}</Input
    >
    <div class="grid gap-3 sm:grid-cols-2">
      <Input v-model="form.baseBranch" required :disabled placeholder="main">{{
        t("tasks.git.baseBranch")
      }}</Input>
      <Input
        v-model="form.branch"
        required
        :disabled
        placeholder="parlance/translations"
        :helper="t('tasks.git.branchHelp')"
        >{{ t("tasks.git.branch") }}</Input
      >
    </div>
    <Input
      v-model="token"
      type="password"
      autocomplete="off"
      :disabled="disabled || removeToken"
      :placeholder="hasToken ? t('tasks.git.tokenKept') : undefined"
      :helper="t('tasks.git.tokenHelp')"
      >{{ t("tasks.git.token") }}</Input
    >
    <Checkbox v-if="hasToken" v-model="removeToken" :disabled>
      <template #description>{{ t("tasks.git.removeToken") }}</template>
    </Checkbox>

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
          placeholder="lang/{locale}.json"
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
        {{ t("tasks.git.pathHelp") }}
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
    <Checkbox
      v-model="form.includeDrafts"
      :disabled
      :helper="t('transfer.includeDraftsHelp')"
    >
      <template #description>{{ t("transfer.includeDrafts") }}</template>
    </Checkbox>
    <Input
      v-model="form.apiUrl"
      type="url"
      :disabled
      placeholder="https://api.github.com"
      :helper="t('tasks.git.apiUrlHelp')"
      >{{ t("tasks.git.apiUrl") }}</Input
    >

    <div class="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        dense
        ghost
        :disabled="disabled || store.checkAccess.isPending"
        @click="checkAccess"
      >
        {{
          store.checkAccess.isPending
            ? t("tasks.git.checking")
            : t("tasks.git.check")
        }}
      </Button>
      <p
        v-if="check"
        role="status"
        class="text-xs"
        :class="
          check.ok
            ? 'text-green-700 dark:text-green-300'
            : 'text-red-600 dark:text-rose-300'
        "
      >
        {{
          check.ok
            ? t("tasks.git.checkOk")
            : t("tasks.git.checkFailed", { error: check.error ?? "" })
        }}
      </p>
    </div>
  </fieldset>
</template>
