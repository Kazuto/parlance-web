<script setup lang="ts">
import { Button, Dialog, Dropzone, Select } from "@thkzt/eunoia";
import { useZipImport } from "~/composables/import/useZipImport";
import type { ImportMode } from "~/lib/api/schemas/parlance/v1/ImportSchema";

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const { showError, showSuccess } = useErrorHelper();
const { importZip, isPending } = useZipImport();

const file = ref<File | undefined>(undefined);
const mode = ref<ImportMode>("IMPORT_MODE_CREATE_OR_UPDATE");

const hasFile = computed(() => !!file.value);

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

  try {
    const result = await importZip(file.value, [], mode.value);

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

    emit("close");
  } catch (error) {
    showError(error);
  }
}

function handleClose() {
  if (!isPending.value) {
    file.value = undefined;
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
      <Dropzone
        v-model="file"
        :label="t('import.zip.file')"
        :description="t('import.zip.description')"
        accept=".zip,application/zip"
        :disabled="isPending"
      />

      <Select v-model="mode" :options="modeOptions" :disabled="isPending">
        {{ t("import.mode") }}
      </Select>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="isPending" @click="handleClose">
          {{ t("common.cancel") }}
        </Button>
        <Button primary :disabled="isPending || !hasFile" @click="handleSubmit">
          {{ isPending ? t("import.importing") : t("import.zip.import") }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
