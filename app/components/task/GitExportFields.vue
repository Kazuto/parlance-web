<script setup lang="ts">
import { Checkbox, Input } from "@thkzt/eunoia";
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
  scopeOptions: (Option & { exportFormat?: ExportFormat })[];
  /** The chosen scopes' tags */
  tagOptions?: Option[];
  disabled?: boolean;
}>();

const form = defineModel<GitExportForm>({ required: true });
const token = defineModel<string>("token", { required: true });
const removeToken = defineModel<boolean>("removeToken", { required: true });

const { t } = useI18n();
const { showError } = useErrorHelper();
const store = useTaskStore();

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

    <!-- The fields change the form in place; it is never replaced. -->
    <TaskExportSelectionFields
      :model-value="form"
      :locale-options
      :scope-options
      :tag-options
      :default-paths="DEFAULT_PATHS"
      :path-help="t('tasks.git.pathHelp')"
      :disabled
    />
    <Input
      v-model="form.apiUrl"
      type="url"
      :disabled
      placeholder="https://api.github.com"
      :helper="t('tasks.git.apiUrlHelp')"
      >{{ t("tasks.git.apiUrl") }}</Input
    >

    <TaskAccessCheck
      :result="check"
      :pending="store.checkAccess.isPending"
      :disabled
      :ok-text="t('tasks.git.checkOk')"
      @check="checkAccess"
    />
  </fieldset>
</template>
