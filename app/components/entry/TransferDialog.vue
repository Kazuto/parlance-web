<script setup lang="ts">
import { Button, Dialog } from "@thkzt/eunoia";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

const props = defineProps<{
  open: boolean;
  action: "import" | "export";
  locales: Locale[];
}>();
const emit = defineEmits<{ close: [] }>();
const isPending = ref(false);
const formKey = ref(0);
const { t } = useI18n();

// The form's actions show in the dialog footer, driven through what it exposes.
const form = ref<{
  submit: () => Promise<void>;
  canSubmit: boolean;
  submitLabel: string;
  done: boolean;
  canGoBack: boolean;
  back: () => void;
}>();

// Remount the form on every open so it starts from a clean state.
watch(
  () => props.open,
  (open) => {
    if (open) formKey.value++;
  },
);

function handleClose() {
  if (!isPending.value) emit("close");
}
</script>

<template>
  <Dialog
    :open
    :title="t(action === 'import' ? 'entries.import' : 'entries.export')"
    :persistent="isPending"
    @close="handleClose"
  >
    <EntryTransferForm
      ref="form"
      :key="`${action}-${formKey}`"
      v-model:pending="isPending"
      :action
      :locales
      external-actions
      @exported="emit('close')"
    />

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="isPending" @click="handleClose">
          {{ form?.done ? t("common.close") : t("common.cancel") }}
        </Button>
        <Button
          v-if="form?.canGoBack"
          type="button"
          ghost
          :disabled="isPending"
          @click="form?.back()"
        >
          {{ t("common.back") }}
        </Button>
        <Button
          v-if="!form?.done"
          primary
          :disabled="!form?.canSubmit"
          @click="form?.submit()"
        >
          {{ form?.submitLabel }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
