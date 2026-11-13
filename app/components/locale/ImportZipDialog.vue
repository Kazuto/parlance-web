<script setup lang="ts">
import {
  Button,
  Checkbox,
  Dialog,
  Dropzone,
  Select,
  Stepper,
} from "@thkzt/eunoia";
import { useZipImport } from "~/composables/import/useZipImport";
import { api } from "~/lib/api";
import type {
  ImportMode,
  ImportZipResponse,
  LocaleImportResult,
} from "~/lib/api/schemas/parlance/v1/ImportSchema";
import { languageName } from "~/lib/languageNames";

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t, locale: uiLocale } = useI18n();
const { showError, showSuccess } = useErrorHelper();
const { importZip, isPending } = useZipImport();
// The files are named by language code; their languages' forms of address go
// into the preview's checks.
const { items: locales } = useAllPages(
  api.locales.list,
  (response) => response.locales,
);
const localeFormality = (code?: string | null) =>
  formalityOf(locales.value.find((locale) => locale.code === code));
// Its files decide which entries an import that deletes missing ones keeps.
const defaultLocale = computed(() =>
  locales.value.find((locale) => locale.isDefault && !locale.deletedAt),
);

const file = ref<File | undefined>(undefined);
const mode = ref<ImportMode>("IMPORT_MODE_CREATE_OR_UPDATE");
// Imported text lands as drafts unless a reviewer vouches for it.
const approve = ref(false);
// Deletes the entries the default language's file doesn't hold.
const deleteMissing = ref(false);
const { can } = usePermission();
const canApprove = computed(() => can.value("review_entry"));
const canCreateLocales = computed(() => can.value("create_locale"));
const canDeleteMissing = computed(
  () => can.value("delete_entry") && !!defaultLocale.value,
);

const hasFile = computed(() => !!file.value);
// The import is tried first, and its preview confirmed. A preview is only good for
// the inputs it was made with.
const preview = ref<ImportZipResponse>();

watch([file, mode, approve, deleteMissing], () => {
  preview.value = undefined;
});

// The preview's files by language, as they came: scope folders may hold several
// files of one language. A missing language the import can create is created only
// when ticked.
const previewLocales = computed(() => {
  const files = new Map<string, LocaleImportResult[]>();

  for (const item of preview.value?.results ?? []) {
    const code = item.localeCode ?? "";

    files.set(code, [...(files.get(code) ?? []), item]);
  }

  return [...files].map(([code, items]) => ({
    code,
    items,
    creatable:
      canCreateLocales.value &&
      items.some((item) => item.localeMissing && !blockedReason(item)),
  }));
});
const createLocaleCodes = ref<string[]>([]);

const skippedLocale = (locale: { code: string; creatable: boolean }) =>
  locale.creatable && !createLocaleCodes.value.includes(locale.code);

function setCreateLocale(code: string, create: boolean) {
  createLocaleCodes.value = create
    ? [...createLocaleCodes.value, code]
    : createLocaleCodes.value.filter((item) => item !== code);
}

/** Why a missing language can't be created, if it can't. */
function blockedReason(item: LocaleImportResult) {
  const reason = item.missingReason;

  return reason && reason !== "MISSING_LOCALE_REASON_UNSPECIFIED"
    ? String(reason)
    : undefined;
}

// The settings and file, then the preview to confirm; going back drops the preview.
// Labels are computed so they follow the language, which may load after mounting.
const steps = computed(() => [
  { label: t("transfer.stepFile") },
  { label: t("transfer.stepReview") },
]);
const step = computed({
  get: () => (preview.value ? 1 : 0),
  set: (value) => {
    if (value === 0) preview.value = undefined;
  },
});

const fileName = (code: string) => {
  const name = languageName(code, uiLocale.value);

  return name ? `${name} (${code})` : code;
};

const modeOptions = computed(() => [
  {
    label: t("import.modes.createOrUpdate"),
    value: "IMPORT_MODE_CREATE_OR_UPDATE" as ImportMode,
  },
  {
    label: t("import.modes.createOnly"),
    value: "IMPORT_MODE_CREATE_ONLY" as ImportMode,
  },
  {
    label: t("import.modes.updateOnly"),
    value: "IMPORT_MODE_UPDATE_ONLY" as ImportMode,
  },
  {
    label: t("import.modes.replaceAll"),
    value: "IMPORT_MODE_REPLACE_ALL" as ImportMode,
  },
]);

async function handleSubmit() {
  if (!file.value) {
    showError(t("import.fileRequired"));

    return;
  }

  const dryRun = !preview.value;

  try {
    const result = await importZip(
      file.value,
      [],
      mode.value,
      canApprove.value && approve.value,
      dryRun,
      dryRun ? [] : createLocaleCodes.value,
      canDeleteMissing.value && deleteMissing.value,
    );

    if (dryRun) {
      preview.value = result;
      createLocaleCodes.value = previewLocales.value
        .filter((locale) => locale.creatable)
        .map((locale) => locale.code);

      return;
    }

    const results = result.results ?? [];
    // Files the import couldn't take, e.g. of a language that doesn't exist, are
    // skipped whole.
    const skipped = results.filter((item) => item.error).length;
    const counts = {
      locales: results.length - skipped,
      created: result.totalCreated ?? 0,
      updated: result.totalUpdated ?? 0,
      failed: result.totalFailed ?? 0,
      skipped,
    };

    const created = [
      ...new Set(
        results
          .filter((item) => item.localeCreated)
          .map((item) => fileName(item.localeCode ?? "")),
      ),
    ];
    const createdNote = created.length
      ? ` ${t("import.zip.localesCreated", {
          locales: new Intl.ListFormat(uiLocale.value).format(created),
        })}`
      : "";
    const deleted = result.deletion?.entriesDeleted ?? 0;
    const notes =
      createdNote +
      (deleted ? ` ${t("import.zip.entriesDeleted", { count: deleted })}` : "");

    if (counts.failed + counts.skipped > 0) {
      showError(t("import.zip.completedWithSkipped", counts) + notes);
    } else {
      showSuccess(t("import.zip.success", counts) + notes);
    }

    reset();
    emit("close");
  } catch (error) {
    showError(error);
  }
}

function reset() {
  file.value = undefined;
  preview.value = undefined;
  createLocaleCodes.value = [];
  deleteMissing.value = false;
}

function handleClose() {
  if (!isPending.value) {
    reset();
    emit("close");
  }
}
</script>

<template>
  <Dialog
    :open
    :title="t('import.zip.title')"
    :persistent="isPending"
    @close="handleClose"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <!-- The stepper has no margin of its own, so the form's spacing misses it. -->
      <div class="py-2">
        <Stepper v-model="step" :steps :clickable="!isPending" dense />
      </div>

      <template v-if="!preview">
        <Dropzone
          v-model="file"
          :label="t('import.zip.file')"
          :description="t('import.zip.description')"
          accept=".zip,application/zip"
          :disabled="isPending"
        />

        <Select
          v-model="mode"
          teleport-to="body"
          :options="modeOptions"
          :disabled="isPending"
        >
          {{ t("import.mode") }}
        </Select>

        <Checkbox
          v-if="canApprove"
          v-model="approve"
          :disabled="isPending"
          :helper="t('transfer.approveHelp')"
        >
          <template #description>{{ t("transfer.approve") }}</template>
        </Checkbox>

        <Checkbox
          v-if="canDeleteMissing"
          v-model="deleteMissing"
          :disabled="isPending"
          :helper="t('import.zip.deleteMissingHelp')"
        >
          <template #description>
            {{
              t("import.zip.deleteMissing", {
                locale: fileName(defaultLocale?.code ?? ""),
              })
            }}
          </template>
        </Checkbox>
      </template>

      <section v-else class="space-y-4" :aria-label="t('importPreview.title')">
        <p role="status" class="text-sm text-neutral-500 dark:text-neutral-400">
          {{ t("importPreview.hint") }}
        </p>
        <section
          v-for="previewLocale in previewLocales"
          :key="previewLocale.code"
          class="space-y-2"
          :aria-label="fileName(previewLocale.code)"
        >
          <h3 class="text-sm font-bold dark:text-neutral-100">
            {{ fileName(previewLocale.code) }}
          </h3>
          <template v-if="previewLocale.creatable">
            <Checkbox
              :model-value="createLocaleCodes.includes(previewLocale.code)"
              :disabled="isPending"
              :helper="t('import.zip.createLocaleHelp')"
              @update:model-value="
                (create) => setCreateLocale(previewLocale.code, !!create)
              "
            >
              <template #description>
                {{
                  t("import.zip.createLocale", {
                    locale: fileName(previewLocale.code),
                  })
                }}
              </template>
            </Checkbox>
            <p
              v-if="skippedLocale(previewLocale)"
              class="text-sm text-neutral-500 dark:text-neutral-400"
            >
              {{ t("import.zip.fileSkipped") }}
            </p>
          </template>
          <div
            v-for="(item, index) in previewLocale.items"
            :key="index"
            :class="{ 'opacity-50': skippedLocale(previewLocale) }"
          >
            <p
              v-if="blockedReason(item)"
              role="alert"
              class="text-sm text-red-600"
            >
              {{
                t(`import.zip.missing.${blockedReason(item)}`, {
                  locale: fileName(previewLocale.code),
                  code: previewLocale.code,
                })
              }}
            </p>
            <p v-else-if="item.error" role="alert" class="text-sm text-red-600">
              {{ item.error }}
            </p>
            <EntryImportPreview
              v-else-if="item.result"
              :result="item.result"
              :locale-code="item.localeCode ?? undefined"
              :formality="localeFormality(item.localeCode)"
              :in-zip="(preview.results?.length ?? 0) > 1"
            />
          </div>
        </section>
        <EntryImportDeletion
          v-if="preview.deletion"
          :deletion="preview.deletion"
          :locale-code="defaultLocale?.code ?? undefined"
        />
      </section>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="isPending" @click="handleClose">
          {{ t("common.cancel") }}
        </Button>
        <Button
          v-if="preview"
          type="button"
          ghost
          :disabled="isPending"
          @click="step = 0"
        >
          {{ t("common.back") }}
        </Button>
        <Button primary :disabled="isPending || !hasFile" @click="handleSubmit">
          {{
            isPending
              ? t("import.importing")
              : preview
                ? t("import.zip.import")
                : t("transfer.preview")
          }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
