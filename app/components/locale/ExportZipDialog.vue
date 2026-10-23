<script setup lang="ts">
import { Button, Checkbox, Dialog } from "@thkzt/eunoia";

// Exports every locale as a ZIP of JSON files, with or without drafts.
defineProps<{ open: boolean; pending?: boolean }>();

const emit = defineEmits<{ close: []; export: [includeDrafts: boolean] }>();
const { t } = useI18n();

const includeDrafts = ref(false);
</script>

<template>
  <Dialog
    :open
    :title="t('export.zip.title')"
    :persistent="pending"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <p class="text-sm text-neutral-500 dark:text-neutral-400">
        {{ t("export.zip.description") }}
      </p>
      <Checkbox
        v-model="includeDrafts"
        :disabled="pending"
        :helper="t('transfer.includeDraftsHelp')"
      >
        <template #description>{{ t("transfer.includeDrafts") }}</template>
      </Checkbox>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="pending" @click="emit('close')">
          {{ t("common.cancel") }}
        </Button>
        <Button
          primary
          :disabled="pending"
          @click="emit('export', includeDrafts)"
        >
          {{ pending ? t("export.zip.exporting") : t("export.zip.export") }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
