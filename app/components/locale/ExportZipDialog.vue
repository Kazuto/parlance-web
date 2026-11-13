<script setup lang="ts">
import { Button, Checkbox, Dialog, Select } from "@thkzt/eunoia";
import {
  zipFolderName,
  type ZipExportOptions,
} from "~/composables/export/useZipExport";
import { api } from "~/lib/api";
import type { ExportFormat } from "~/lib/api/schemas/parlance/v1/TaskSchema";

// Exports languages as a ZIP: a file per language, or with scopes chosen a folder
// per scope, each in the scope's default format.
defineProps<{ open: boolean; pending?: boolean }>();

const emit = defineEmits<{ close: []; export: [options: ZipExportOptions] }>();
const { t } = useI18n();
const localeName = useLocaleName();

const localeIds = ref<string[]>([]);
const scopeIds = ref<string[]>([]);
const tagIds = ref<string[]>([]);
const format = ref<ExportFormat>("EXPORT_FORMAT_JSON");
const includeDrafts = ref(false);
const includeUnreleased = ref(false);

const { items: locales } = useAllPages(
  api.locales.list,
  (response) => response.locales,
);
const localeOptions = computed(() =>
  locales.value
    .filter((locale) => locale.id && locale.code && !locale.deletedAt)
    .map((locale) => ({
      label: `${localeName(locale)} (${locale.code})`,
      value: locale.id!,
    })),
);
const scopeChoices = useScopeOptions();
const {
  options: scopeOptions,
  error: scopeError,
  isFetching: scopesLoading,
} = scopeChoices;
// Only tags of the chosen scopes; removing a scope removes its tags.
const { tagOptions } = useScopedTags(scopeIds, tagIds, scopeChoices);

const EXTENSIONS: Record<string, string> = {
  EXPORT_FORMAT_JSON: "json",
  EXPORT_FORMAT_PHP: "php",
  EXPORT_FORMAT_PO: "po",
};
const formatOptions = computed(() =>
  (
    ["EXPORT_FORMAT_JSON", "EXPORT_FORMAT_PHP", "EXPORT_FORMAT_PO"] as const
  ).map((value) => ({ value, label: t(`tasks.git.format.${value}`) })),
);

// The language the examples name: the first chosen one, or the first there is.
const exampleCode = computed(() => {
  const options = localeOptions.value;
  const example =
    options.find((option) => localeIds.value.includes(option.value)) ??
    options[0];

  return (
    locales.value.find((locale) => locale.id === example?.value)?.code ?? "en"
  );
});
// An example file of each chosen scope's folder, e.g. "mail/de.php"
const folders = computed(() =>
  scopeOptions.value
    .filter((scope) => scopeIds.value.includes(scope.value))
    .map((scope) => ({
      scope: scope.label,
      file: `${zipFolderName(scope.slug)}/${exampleCode.value}.${EXTENSIONS[scope.exportFormat ?? format.value]}`,
    })),
);

function submit() {
  emit("export", {
    localeIds: [...localeIds.value],
    scopeIds: [...scopeIds.value],
    tagIds: [...tagIds.value],
    format: format.value,
    includeDrafts: includeDrafts.value,
    includeUnreleased: includeUnreleased.value,
  });
}
</script>

<template>
  <Dialog
    :open
    :title="t('export.zip.title')"
    :persistent="pending"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <Select
        v-model="localeIds"
        teleport-to="body"
        multiple
        :options="localeOptions"
        :disabled="pending"
        :placeholder="t('common.allLanguages')"
        >{{ t("common.languages") }}</Select
      >
      <div class="space-y-1">
        <Select
          v-model="scopeIds"
          teleport-to="body"
          multiple
          :options="scopeOptions"
          :disabled="pending || scopesLoading"
          :invalid="!!scopeError"
          :placeholder="t('scopes.all')"
          >{{ t("nav.scopes") }}</Select
        >
        <p v-if="scopeError" role="alert" class="text-xs text-red-600">
          {{ t("scopes.loadFailed") }}
        </p>
      </div>
      <div v-if="scopeIds.length && tagOptions.length" class="space-y-1">
        <Select
          v-model="tagIds"
          teleport-to="body"
          multiple
          :options="tagOptions"
          :disabled="pending"
          :placeholder="t('tags.select')"
          >{{ t("tags.title") }}</Select
        >
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t("tags.exportHelp") }}
        </p>
      </div>
      <Select
        v-model="format"
        teleport-to="body"
        :options="formatOptions"
        :disabled="pending"
        >{{
          scopeIds.length ? t("export.zip.fallbackFormat") : t("common.format")
        }}</Select
      >
      <Checkbox
        v-model="includeDrafts"
        :disabled="pending"
        :helper="t('transfer.includeDraftsHelp')"
      >
        <template #description>{{ t("transfer.includeDrafts") }}</template>
      </Checkbox>
      <Checkbox
        v-model="includeUnreleased"
        :disabled="pending"
        :helper="t('transfer.includeUnreleasedHelp')"
      >
        <template #description>{{ t("transfer.includeUnreleased") }}</template>
      </Checkbox>
      <div class="text-sm text-neutral-500 dark:text-neutral-400">
        <p v-if="!folders.length">
          {{
            t("export.zip.layoutFlat", {
              file: `${exampleCode}.${EXTENSIONS[format]}`,
            })
          }}
        </p>
        <template v-else>
          <p>{{ t("export.zip.layoutScopes") }}</p>
          <ul class="mt-1 space-y-0.5">
            <li v-for="folder in folders" :key="folder.file">
              <code class="font-mono">{{ folder.file }}</code>
              ({{ folder.scope }})
            </li>
          </ul>
        </template>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="pending" @click="emit('close')">
          {{ t("common.cancel") }}
        </Button>
        <Button primary :disabled="pending" @click="submit">
          {{ pending ? t("export.zip.exporting") : t("export.zip.export") }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
