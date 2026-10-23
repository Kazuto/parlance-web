<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { TranslationServer } from "~/lib/api/schemas/parlance/v1/TranslationServerSchema";

const props = defineProps<{ open: boolean; item?: TranslationServer }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const store = useTranslationServerStore();
const { isPending, run, cancel } = useConfirmMutation(
  () => store.destroy,
  () => emit("close"),
);

function handleConfirm() {
  if (!props.item?.id) return;
  run(
    { id: props.item.id },
    t("translationServers.deleted", { name: props.item.name ?? "" }),
  );
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('translationServers.deleteTitle', { name: item?.name ?? '' })"
    :persistent="isPending"
    @cancel="cancel"
    @close="cancel"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-500 dark:text-neutral-400">
      {{ t("translationServers.deleteConfirm") }}
    </p>
  </ConfirmDialog>
</template>
