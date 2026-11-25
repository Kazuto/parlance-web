<script setup lang="ts">
import { Checkbox, Input, NumberInput } from "@thkzt/eunoia";
import type { ExportFormat } from "~/lib/api/schemas/parlance/v1/TaskSchema";
import {
  DEFAULT_S3_PATHS,
  FULL_HASH_LENGTH,
  formToSettings,
  taskToForm,
  type Option,
  type S3ExportForm,
} from "~/lib/taskForm";

// Where an S3 export goes and what it holds. The stored secret access key is never
// shown: it can only be replaced or removed.
const props = defineProps<{
  /** The task being edited, whose saved secret key a check can use. */
  taskId?: string;
  hasToken?: boolean;
  localeOptions: Option[];
  scopeOptions: (Option & { exportFormat?: ExportFormat })[];
  /** The chosen scopes' tags */
  tagOptions?: Option[];
  disabled?: boolean;
}>();

const form = defineModel<S3ExportForm>({ required: true });
const token = defineModel<string>("token", { required: true });
const removeToken = defineModel<boolean>("removeToken", { required: true });

const { t } = useI18n();
const { showError } = useErrorHelper();
const store = useTaskStore();

const check = ref<{ ok: boolean; error?: string }>();

watch(
  () => [
    form.value.endpoint,
    form.value.region,
    form.value.bucket,
    form.value.accessKeyId,
    form.value.pathStyle,
    form.value.manifestPath,
  ],
  () => (check.value = undefined),
);

async function checkAccess() {
  check.value = undefined;

  // Unsaved settings are checked as they stand; the key falls back to the saved one.
  const settings = formToSettings({
    ...taskToForm(undefined, "TASK_TYPE_S3_EXPORT"),
    s3: form.value,
  });

  try {
    const result = await store.checkAccess.mutateAsync({
      id: props.taskId,
      s3Export: settings.s3Export,
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
      {{ t("tasks.s3.title") }}
    </legend>
    <div class="grid gap-3 sm:grid-cols-2">
      <Input
        v-model="form.endpoint"
        type="url"
        :disabled
        placeholder="https://s3.example.com"
        :helper="t('tasks.s3.endpointHelp')"
        >{{ t("tasks.s3.endpoint") }}</Input
      >
      <Input
        v-model="form.region"
        :disabled
        placeholder="us-east-1"
        :helper="t('tasks.s3.regionHelp')"
        >{{ t("tasks.s3.region") }}</Input
      >
    </div>
    <Input
      v-model="form.bucket"
      required
      :disabled
      placeholder="translations"
      class="font-mono"
      >{{ t("tasks.s3.bucket") }}</Input
    >
    <Checkbox
      v-model="form.pathStyle"
      :disabled
      :helper="t('tasks.s3.pathStyleHelp')"
    >
      <template #description>{{ t("tasks.s3.pathStyle") }}</template>
    </Checkbox>
    <div class="grid gap-3 sm:grid-cols-2">
      <Input
        v-model="form.accessKeyId"
        required
        autocomplete="off"
        :disabled
        class="font-mono"
        >{{ t("tasks.s3.accessKeyId") }}</Input
      >
      <Input
        v-model="token"
        type="password"
        autocomplete="off"
        :disabled="disabled || removeToken"
        :placeholder="hasToken ? t('tasks.s3.secretKeyKept') : undefined"
        >{{ t("tasks.s3.secretKey") }}</Input
      >
    </div>
    <p class="text-xs text-neutral-500 dark:text-neutral-400">
      {{ t("tasks.s3.secretKeyHelp") }}
    </p>
    <Checkbox v-if="hasToken" v-model="removeToken" :disabled>
      <template #description>{{ t("tasks.s3.removeSecretKey") }}</template>
    </Checkbox>

    <!-- The fields change the form in place; it is never replaced. -->
    <TaskExportSelectionFields
      :model-value="form"
      :locale-options
      :scope-options
      :tag-options
      :default-paths="DEFAULT_S3_PATHS"
      :path-help="t('tasks.s3.pathHelp')"
      :disabled
    />
    <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
      <Input
        v-model="form.manifestPath"
        required
        :disabled
        placeholder="i18n/manifest.json"
        class="font-mono"
        :helper="t('tasks.s3.manifestPathHelp')"
        >{{ t("tasks.s3.manifestPath") }}</Input
      >
      <NumberInput
        v-model="form.hashLength"
        :min="8"
        :max="FULL_HASH_LENGTH"
        :disabled
        :helper="t('tasks.s3.hashLengthHelp')"
        >{{ t("tasks.s3.hashLength") }}</NumberInput
      >
    </div>

    <TaskAccessCheck
      :result="check"
      :pending="store.checkAccess.isPending"
      :disabled
      :ok-text="t('tasks.s3.checkOk')"
      @check="checkAccess"
    />
  </fieldset>
</template>
