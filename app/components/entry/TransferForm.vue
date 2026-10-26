<script setup lang="ts">
import { Button, Checkbox, Dropzone, Select, Stepper } from "@thkzt/eunoia";
import { useMutation } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { useTranslationDataInvalidation } from "~/lib/api/invalidation";
import { downloadBlob, fileToBase64 } from "~/lib/files";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";
import type {
  ImportMode,
  ImportResult,
} from "~/lib/api/schemas/parlance/v1/ImportSchema";

const props = defineProps<{
  action: "import" | "export";
  locales: Locale[];
  /** The parent shows the actions, e.g. in a dialog footer, through what is exposed. */
  externalActions?: boolean;
}>();
const emit = defineEmits<{ exported: [] }>();
const isPending = defineModel<boolean>("pending", { default: false });
const invalidateTranslationData = useTranslationDataInvalidation();
const importJson = useMutation(api.imports.json.use());
const importPhp = useMutation(api.imports.php.use());
const importPo = useMutation(api.imports.po.use());
const exportJson = useMutation(api.exports.json.use());
const exportPhp = useMutation(api.exports.php.use());
const exportPo = useMutation(api.exports.po.use());
const localeId = ref("");
const scopeIds = ref<string[]>([]);
const format = ref("json");
const mode = ref<ImportMode>("IMPORT_MODE_CREATE_OR_UPDATE");
// Imports land as drafts unless a reviewer vouches for them; exports leave drafts out.
const approve = ref(false);
const includeDrafts = ref(false);
const { can } = usePermission();
const canApprove = computed(() => can.value("review_entry"));
const file = ref<File>();
const error = ref<string>();
// An import is tried first, and its preview confirmed; then its result shows.
const preview = ref<ImportResult>();
const result = ref<ImportResult>();
// Its steps: the settings and file, then the preview to confirm. Once it's kept, both
// are done.
const step = computed({
  get: () => (result.value ? 2 : preview.value ? 1 : 0),
  set: (value) => {
    if (value === 0) back();
  },
});
const { t } = useI18n();
const localeName = useLocaleName();
const { showSuccess, showError, getErrorMessage } = useErrorHelper();
const localeOptions = computed(() =>
  props.locales
    .filter((locale) => locale.id && locale.code && !locale.deletedAt)
    .map((locale) => ({
      label: `${localeName(locale)} (${locale.code})`,
      value: locale.id ?? "",
    })),
);
const {
  options: scopeOptions,
  error: scopeError,
  isFetching: scopesLoading,
} = useScopeOptions();
const selectedScopeNames = computed(() =>
  scopeOptions.value
    .filter((option) => scopeIds.value.includes(option.value))
    .map((option) => option.label)
    .join(", "),
);
const formatOptions = [
  { label: t("transfer.json"), value: "json" },
  { label: t("transfer.php"), value: "php" },
  { label: t("transfer.po"), value: "po" },
];
const fileAccept = computed(() =>
  format.value === "json"
    ? ".json,application/json"
    : format.value === "po"
      ? ".po,text/x-gettext-translation"
      : ".php",
);
const steps = [
  { label: t("transfer.stepFile") },
  { label: t("transfer.stepReview") },
];
const modeOptions = [
  { label: t("transfer.upsert"), value: "IMPORT_MODE_CREATE_OR_UPDATE" },
  { label: t("transfer.createOnly"), value: "IMPORT_MODE_CREATE_ONLY" },
  { label: t("transfer.updateOnly"), value: "IMPORT_MODE_UPDATE_ONLY" },
];

// Locales may still be loading when the form mounts, so pick the default once they arrive.
watch(
  localeOptions,
  (options) => {
    if (options.some((option) => option.value === localeId.value)) return;
    localeId.value =
      props.locales.find((locale) => locale.isDefault && !locale.deletedAt)
        ?.id ??
      options[0]?.value ??
      "";
  },
  { immediate: true },
);
watch(format, () => {
  file.value = undefined;
  error.value = undefined;
});
// A preview is only good for the inputs it was made with.
watch(
  [localeId, format, scopeIds, mode, approve, file],
  () => {
    preview.value = undefined;
    result.value = undefined;
  },
  { deep: true },
);

// Back to the settings, which drops the preview made from them
function back() {
  preview.value = undefined;
  error.value = undefined;
}

function startOver() {
  result.value = undefined;
  file.value = undefined;
}

function encodeFile(value: File): Promise<string> {
  return fileToBase64(value).catch(() => {
    throw new Error(t("transfer.readFailed"));
  });
}

const selectedLocale = computed(() =>
  props.locales.find((item) => item.id === localeId.value),
);
// A finished import is done until something changes.
const canSubmit = computed(
  () => !isPending.value && localeOptions.value.length > 0 && !result.value,
);
const submitLabel = computed(() => {
  if (isPending.value) return t("common.processing");
  if (props.action === "export") return t("transfer.download");

  return preview.value ? t("entries.import") : t("transfer.preview");
});

async function handleSubmit() {
  if (isPending.value) return;
  error.value = undefined;

  const locale = selectedLocale.value;

  if (!locale?.id || !locale.code) {
    error.value = t("transfer.languageRequired");

    return;
  }

  if (props.action === "import" && !file.value) {
    error.value = t("transfer.fileRequired");

    return;
  }

  isPending.value = true;

  try {
    if (props.action === "import") {
      const selectedFile = file.value!;
      const input = {
        localeId: locale.id,
        filename: selectedFile.name,
        fileContent: await encodeFile(selectedFile),
        mode: mode.value,
        scopeIds: scopeIds.value,
        approve: canApprove.value && approve.value,
        dryRun: !preview.value,
      };
      const response = await (format.value === "po"
        ? importPo.mutateAsync(input)
        : format.value === "php"
          ? importPhp.mutateAsync(input)
          : importJson.mutateAsync(input));

      if (!response.result) throw new Error(t("transfer.missingImportResult"));

      if (input.dryRun) {
        preview.value = response.result;
      } else {
        preview.value = undefined;
        result.value = response.result;
        await invalidateTranslationData();
      }
    } else {
      const input = {
        localeCode: locale.code,
        scopeIds: scopeIds.value,
        includeDrafts: includeDrafts.value,
      };
      const response = await (format.value === "po"
        ? exportPo.mutateAsync(input)
        : format.value === "php"
          ? exportPhp.mutateAsync(input)
          : exportJson.mutateAsync(input));

      if (response.content == null)
        throw new Error(t("transfer.missingExportContent"));
      downloadBlob(
        new Blob([response.content], {
          type:
            format.value === "json"
              ? "application/json;charset=utf-8"
              : format.value === "po"
                ? "text/x-gettext-translation;charset=utf-8"
                : "text/plain;charset=utf-8",
        }),
        response.filename ?? `${locale.code}.${format.value}`,
      );
      showSuccess(t("transfer.exported"));
      emit("exported");
    }
  } catch (cause) {
    showError(cause);
    error.value = getErrorMessage(cause);
  } finally {
    isPending.value = false;
  }
}

defineExpose({
  submit: handleSubmit,
  canSubmit,
  submitLabel,
  /** An import finished, so its summary shows and only closing is left. */
  done: computed(() => !!result.value),
  /** An import's preview shows, so its settings can be changed again. */
  canGoBack: computed(() => step.value === 1),
  back,
});
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <!-- The stepper has no margin of its own, so the form's spacing misses it. -->
    <div v-if="action === 'import'" class="py-2">
      <Stepper v-model="step" :steps :clickable="!result && !isPending" dense />
    </div>
    <template v-if="step === 0">
      <Select
        v-model="localeId"
        teleport-to="body"
        :options="localeOptions"
        :disabled="isPending"
        :placeholder="t('transfer.selectLanguage')"
        >{{ t("common.language") }}</Select
      >
      <Select
        v-model="format"
        teleport-to="body"
        :options="formatOptions"
        :disabled="isPending"
        >{{ t("common.format") }}</Select
      >
      <div class="space-y-1">
        <Select
          v-model="scopeIds"
          teleport-to="body"
          multiple
          :options="scopeOptions"
          :disabled="isPending || scopesLoading"
          :invalid="!!scopeError"
          :placeholder="t(action === 'import' ? 'scopes.select' : 'scopes.all')"
          >{{ t("nav.scopes") }}</Select
        >
        <p v-if="scopeError" role="alert" class="text-xs text-red-600">
          {{ t("scopes.loadFailed") }}
        </p>
        <p
          v-else-if="action === 'import'"
          class="text-xs text-neutral-500 dark:text-neutral-400"
        >
          {{ t("transfer.importScopeHelp") }}
        </p>
      </div>
      <template v-if="action === 'import'">
        <Select
          v-model="mode"
          teleport-to="body"
          :options="modeOptions"
          :disabled="isPending"
          >{{ t("transfer.behavior") }}</Select
        >
        <Checkbox
          v-if="canApprove"
          v-model="approve"
          :disabled="isPending"
          :helper="t('transfer.approveHelp')"
        >
          <template #description>{{ t("transfer.approve") }}</template>
        </Checkbox>
        <Dropzone
          v-model="file"
          :accept="fileAccept"
          :disabled="isPending"
          :helper="
            t(format === 'po' ? 'transfer.poImportHelp' : 'transfer.importHelp')
          "
          >{{ t("transfer.file") }}</Dropzone
        >
      </template>
      <Checkbox
        v-if="action === 'export'"
        v-model="includeDrafts"
        :disabled="isPending"
        :helper="t('transfer.includeDraftsHelp')"
      >
        <template #description>{{ t("transfer.includeDrafts") }}</template>
      </Checkbox>
      <p
        v-if="action === 'export'"
        class="text-sm text-neutral-500 dark:text-neutral-400"
      >
        {{
          selectedScopeNames
            ? t("transfer.exportScopeHelp", { scopes: selectedScopeNames })
            : t("transfer.exportHelp")
        }}
        <template v-if="format === 'po'">
          {{ t("transfer.poExportHelp") }}
        </template>
      </p>
    </template>
    <section
      v-else-if="step === 1 && preview"
      class="space-y-3"
      :aria-label="t('importPreview.title')"
    >
      <p role="status" class="text-sm text-neutral-500 dark:text-neutral-400">
        {{ t("importPreview.hint") }}
      </p>
      <EntryImportPreview
        :result="preview"
        :locale-code="selectedLocale?.code ?? undefined"
        :formality="selectedLocale?.formality"
      />
    </section>
    <div
      v-if="result"
      role="status"
      class="space-y-2 rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-700"
    >
      <p>
        {{
          t("transfer.summary", {
            created: result.entriesCreated ?? 0,
            updated: result.entriesUpdated ?? 0,
            skipped: result.entriesSkipped ?? 0,
            failed: result.entriesFailed ?? 0,
          })
        }}
      </p>
      <ul
        v-if="result.errors?.length"
        class="max-h-40 overflow-y-auto text-red-600"
      >
        <li v-for="(item, index) in result.errors" :key="index">
          {{ item.key }}: {{ item.message }}
        </li>
      </ul>
    </div>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    <div v-if="!externalActions" class="flex justify-end gap-3 pt-4">
      <Button
        v-if="step === 1"
        type="button"
        ghost
        :disabled="isPending"
        @click="back"
        >{{ t("common.back") }}</Button
      >
      <Button v-if="result" type="button" @click="startOver">{{
        t("transfer.importAnother")
      }}</Button>
      <Button v-else type="submit" primary :disabled="!canSubmit">{{
        submitLabel
      }}</Button>
    </div>
  </form>
</template>
