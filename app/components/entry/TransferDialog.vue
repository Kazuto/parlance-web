<script setup lang="ts">
import { Button, Dialog, Select } from "@thkzt/eunoia";
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
const localeOptions = computed(() =>
  props.locales
    .filter((locale) => locale.id && locale.code && !locale.deletedAt)
    .map((locale) => ({
      label: `${locale.name ?? locale.code} (${locale.code})`,
      value: locale.id ?? "",
    })),
);
const formatOptions = [
  { label: "JSON (flat key/value pairs)", value: "json" },
  { label: "PHP array", value: "php" },
  { label: "Gettext PO (.po)", value: "po" },
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
  { label: "Create or update entries", value: "IMPORT_MODE_CREATE_OR_UPDATE" },
  { label: "Create new entries only", value: "IMPORT_MODE_CREATE_ONLY" },
  { label: "Update existing entries only", value: "IMPORT_MODE_UPDATE_ONLY" },
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

function selectFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0];
  result.value = undefined;
}

function encodeFile(value: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () =>
      reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(value);
  });
}

async function handleSubmit() {
  if (isPending.value) return;
  error.value = undefined;
  const locale = props.locales.find((item) => item.id === localeId.value);
  if (!locale?.id || !locale.code) {
    error.value = "Select a language.";
    return;
  }
  if (props.action === "import" && !file.value) {
    error.value = "Select a file to import.";
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
      if (!response.result)
        throw new Error("The server did not return an import result.");
      result.value = response.result;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: api.entries.list.getQueryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: api.localizations.list.getQueryKey(),
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
        throw new Error("The server did not return export content.");
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
      toast.add("Translations exported", { variant: "success" });
      emit("close");
    }
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? cause.message
        : `Failed to ${props.action} entries.`;
  } finally {
    isPending.value = false;
  }
}
</script>

<template>
  <Dialog
    :open
    :title="action === 'import' ? 'Import Entries' : 'Export Entries'"
    :persistent="isPending"
    @close="handleClose"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Select
        v-model="localeId"
        :options="localeOptions"
        :disabled="isPending"
        placeholder="Select a language"
        >Language</Select
      >
      <Select v-model="format" :options="formatOptions" :disabled="isPending"
        >Format</Select
      >
      <template v-if="action === 'import'">
        <Select v-model="mode" :options="modeOptions" :disabled="isPending"
          >Import behavior</Select
        >
        <label class="flex flex-col gap-2 text-sm">
          Translation file
          <!-- prettier-ignore -->
          <input
            :key="`${action}-${format}-${open}`"
            type="file"
            :accept="fileAccept"
            :disabled="isPending"
            required
            @change="selectFile"
          >
        </label>
        <p v-if="format === 'po'" class="text-sm text-neutral-500">
          PO files must use UTF-8, with entry keys in msgid and translations in
          msgstr. Empty translations and obsolete entries are skipped.
          Contextual, plural, fuzzy, and duplicate entries are reported as
          failures.
        </p>
        <p v-else class="text-sm text-neutral-500">
          JSON must be a flat object of translation keys and string values. PHP
          must contain a translation array.
        </p>
      </template>
      <p v-else class="text-sm text-neutral-500">
        Download all available translations for this language, across all
        entries and scopes.
        <template v-if="format === 'po'">
          PO exports use entry keys as msgid and include language metadata,
          description comments, and untranslated entries with empty msgstr.
        </template>
      </p>
      <div
        v-if="result"
        role="status"
        class="space-y-2 rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-700"
      >
        <p>
          Created: {{ result.entriesCreated ?? 0 }} · Updated:
          {{ result.entriesUpdated ?? 0 }} · Skipped:
          {{ result.entriesSkipped ?? 0 }} · Failed:
          {{ result.entriesFailed ?? 0 }}
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
          >{{ result ? "Close" : "Cancel" }}</Button
        >
        <Button
          type="submit"
          primary
          :disabled="isPending || !localeOptions.length"
          >{{
            isPending
              ? "Processing…"
              : action === "import"
                ? "Import entries"
                : "Download export"
          }}</Button
        >
      </div>
    </form>
  </Dialog>
</template>
