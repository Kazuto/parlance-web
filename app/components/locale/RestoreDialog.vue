<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

const props = defineProps<{
  open: boolean;
  item?: Locale;
}>();

const { restore } = useLocaleStore();
const { mutateAsync: restoreLocale, isPending } = restore;

const { t } = useI18n();
const { showError, showSuccess } = useErrorHelper();

async function handleSubmit() {
  if (!props.item) return;

  await restoreLocale(
    {
      id: props.item.id,
    },
    {
      onSuccess: () => {
        showSuccess(t("locales.restored", { name: props.item?.name ?? "" }));
      },
      onError: (error) => {
        showError(error);
      },
    },
  );

  handleClose();
}

const emit = defineEmits<{
  close: [];
}>();

function handleClose() {
  if (!isPending) {
    emit("close");
  }
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('locales.restoreTitle', { name: props.item?.name ?? '' })"
    @cancel="handleClose"
    @close="handleClose"
    @confirm="handleSubmit"
  >
    <p class="text-sm text-neutral-700 dark:text-neutral-200">
      {{ t("locales.restoreConfirm") }}
    </p>
  </ConfirmDialog>
</template>
