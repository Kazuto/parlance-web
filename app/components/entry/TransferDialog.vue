<script setup lang="ts">
import { Button, Dialog, Dropzone, Select } from "@thkzt/eunoia";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";
import type {
  ImportMode,
  ImportResult,
} from "~/lib/api/schemas/parlance/v1/ImportSchema";

const props = defineProps<{
  open: boolean;
  action: "import" | "export";
  locales: Locale[];
}>();
const emit = defineEmits<{ close: [] }>();
const queryClient = useQueryClient();
const entriesQueryKey = api.entries.list.getQueryKey();
const entryFeedQueryKey = api.entries.feed.getQueryKey();
const localizationsQueryKey = api.localizations.list.getQueryKey();
const importJson = useMutation(api.imports.json.use());
const importPhp = useMutation(api.imports.php.use());
const importPo = useMutation(api.imports.po.use());
const exportJson = useMutation(api.exports.json.use());
const exportPhp = useMutation(api.exports.php.use());
const exportPo = useMutation(api.exports.po.use());
const isPending = ref(false);
const localeId = ref("");
const format = ref("json");
const mode = ref<ImportMode>("IMPORT_MODE_CREATE_OR_UPDATE");
const file = ref<File>();
const error = ref<string>();
const result = ref<ImportResult>();
const toast = useToast();
const { t } = useI18n();
const localeOptions = computed(() =>
  props.locales
    .filter((locale) => locale.id && locale.code && !locale.deletedAt)
    .map((locale) => ({
      label: `${locale.name ?? locale.code} (${locale.code})`,
      value: locale.id ?? "",
    })),
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

watch(format, () => {
  file.value = undefined;
  result.value = undefined;
  error.value = undefined;
});
const modeOptions = [
  { label: t("transfer.upsert"), value: "IMPORT_MODE_CREATE_OR_UPDATE" },
  { label: t("transfer.createOnly"), value: "IMPORT_MODE_CREATE_ONLY" },
  { label: t("transfer.updateOnly"), value: "IMPORT_MODE_UPDATE_ONLY" },
];

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    localeId.value =
      props.locales.find((locale) => locale.isDefault && !locale.deletedAt)
        ?.id ??
      localeOptions.value[0]?.value ??
      "";
    format.value = "json";
    mode.value = "IMPORT_MODE_CREATE_OR_UPDATE";
    file.value = undefined;
    result.value = undefined;
    error.value = undefined;
  },
);

function handleClose() {
  if (!isPending.value) emit("close");
}

watch(file, () => {
  result.value = undefined;
});

function encodeFile(value: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error(t("transfer.readFailed")));
    reader.readAsDataURL(value);
  });
}

async function handleSubmit() {
  if (isPending.value) return;
  error.value = undefined;
  const locale = props.locales.find((item) => item.id === localeId.value);
  if (!locale?.id || !locale.code) {
    error.value = t("transfer.languageRequired");
    return;
  }
  if (props.action === "import" && !file.value) {
    error.value = t("transfer.fileRequired");
    return;
  }
  isPending.value = true;
  result.value = undefined;
  try {
    if (props.action === "import") {
      const selectedFile = file.value!;
      const input = {
        localeId: locale.id,
        filename: selectedFile.name,
        fileContent: await encodeFile(selectedFile),
        mode: mode.value,
      };
      const response = await (format.value === "po"
        ? importPo.mutateAsync(input)
        : format.value === "php"
          ? importPhp.mutateAsync(input)
          : importJson.mutateAsync(input));
      if (!response.result) throw new Error(t("transfer.missingImportResult"));
      result.value = response.result;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: entriesQueryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: entryFeedQueryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: localizationsQueryKey,
        }),
      ]);
    } else {
      const input = { localeCode: locale.code };
      const response = await (format.value === "po"
        ? exportPo.mutateAsync(input)
        : format.value === "php"
          ? exportPhp.mutateAsync(input)
          : exportJson.mutateAsync(input));
      if (response.content == null)
        throw new Error(t("transfer.missingExportContent"));
      const url = URL.createObjectURL(
        new Blob([response.content], {
          type:
            format.value === "json"
              ? "application/json;charset=utf-8"
              : format.value === "po"
                ? "text/x-gettext-translation;charset=utf-8"
                : "text/plain;charset=utf-8",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = (response.filename ?? `${locale.code}.${format.value}`)
        .split(/[\\/]/)
        .pop()!;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.add(t("transfer.exported"), { variant: "success" });
      emit("close");
    }
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? cause.message
        : t(
            props.action === "import"
              ? "transfer.importFailed"
              : "transfer.exportFailed",
          );
  } finally {
    isPending.value = false;
  }
}
</script>

<template>
  <Dialog
    :open
    :title="
      t(action === 'import' ? 'transfer.importTitle' : 'transfer.exportTitle')
    "
    :persistent="isPending"
    @close="handleClose"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
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
      <template v-if="action === 'import'">
        <Select
          v-model="mode"
          teleport-to="body"
          :options="modeOptions"
          :disabled="isPending"
          >{{ t("transfer.behavior") }}</Select
        >
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
      <p v-else class="text-sm text-neutral-500">
        {{ t("transfer.exportHelp") }}
        <template v-if="format === 'po'">
          {{ t("transfer.poExportHelp") }}
        </template>
      </p>
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
      <div class="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          ghost
          :disabled="isPending"
          @click="handleClose"
          >{{ result ? t("common.close") : t("common.cancel") }}</Button
        >
        <Button
          type="submit"
          primary
          :disabled="isPending || !localeOptions.length"
          >{{
            isPending
              ? t("common.processing")
              : action === "import"
                ? t("entries.import")
                : t("transfer.download")
          }}</Button
        >
      </div>
    </form>
  </Dialog>
</template>
