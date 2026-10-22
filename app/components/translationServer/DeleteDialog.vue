<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { TranslationServer } from "~/lib/api/schemas/parlance/v1/TranslationServerSchema";

const props = defineProps<{ open: boolean; item?: TranslationServer }>();
const emit = defineEmits<{ close: [] }>();
const store = useTranslationServerStore();
const isPending = computed(() => store.destroy.isPending);
const { t } = useI18n();
const { showSuccess, showError } = useErrorHelper();

async function handleConfirm() {
  if (!props.item?.id || isPending.value) return;
  const name = props.item.name ?? "";
  try {
    await store.destroy.mutateAsync({ id: props.item.id });
    showSuccess(t("translationServers.deleted", { name }));
    emit("close");
  } catch (error) {
    showError(error as Error);
  }
}

function handleClose() {
  if (!isPending.value) emit("close");
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('translationServers.deleteTitle', { name: item?.name ?? '' })"
    :persistent="isPending"
    @cancel="handleClose"
    @close="handleClose"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-500 dark:text-neutral-400">
      {{ t("translationServers.deleteConfirm") }}
    </p>
  </ConfirmDialog>
</template>
