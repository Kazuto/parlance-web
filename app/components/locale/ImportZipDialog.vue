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

const file = ref<File | undefined>(undefined);
const mode = ref<ImportMode>("IMPORT_MODE_CREATE_OR_UPDATE");
// Imported text lands as drafts unless a reviewer vouches for it.
const approve = ref(false);
const { can } = usePermission();
const canApprove = computed(() => can.value("review_entry"));

const hasFile = computed(() => !!file.value);
// The import is tried first, and its preview confirmed. A preview is only good for
// the inputs it was made with.
const preview = ref<ImportZipResponse>();

watch([file, mode, approve], () => {
  preview.value = undefined;
});

// The settings and file, then the preview to confirm; going back drops the preview.
const steps = [
  { label: t("transfer.stepFile") },
  { label: t("transfer.stepReview") },
];
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

const modeOptions = [
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
];

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
    );

    if (dryRun) {
      preview.value = result;

      return;
    }

    const totalProcessed = result.results?.length ?? 0;
    const created = result.totalCreated ?? 0;
    const updated = result.totalUpdated ?? 0;
    const failed = result.totalFailed ?? 0;

    if (failed > 0) {
      showError(
        t("import.zip.completedWithErrors", {
          locales: totalProcessed,
          created,
          updated,
          failed,
        }),
      );
    } else {
      showSuccess(
        t("import.zip.success", {
          locales: totalProcessed,
          created,
          updated,
        }),
      );
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
      </template>

      <section v-else class="space-y-4" :aria-label="t('importPreview.title')">
        <p role="status" class="text-sm text-neutral-500 dark:text-neutral-400">
          {{ t("importPreview.hint") }}
        </p>
        <section
          v-for="item in preview.results ?? []"
          :key="item.localeCode ?? ''"
          class="space-y-2"
          :aria-label="fileName(item.localeCode ?? '')"
        >
          <h3 class="text-sm font-bold dark:text-neutral-100">
            {{ fileName(item.localeCode ?? "") }}
          </h3>
          <p v-if="item.error" role="alert" class="text-sm text-red-600">
            {{ item.error }}
          </p>
          <EntryImportPreview
            v-else-if="item.result"
            :result="item.result"
            :locale-code="item.localeCode ?? undefined"
            :formality="localeFormality(item.localeCode)"
            :in-zip="(preview.results?.length ?? 0) > 1"
          />
        </section>
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
