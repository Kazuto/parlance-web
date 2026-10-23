<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

const props = defineProps<{ open: boolean; item?: Locale }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const localeName = useLocaleName();
const name = computed(() => (props.item ? localeName(props.item) : ""));
const localeStore = useLocaleStore();
const { isPending, run, cancel } = useConfirmMutation(
  () => localeStore.restore,
  () => emit("close"),
);

function handleConfirm() {
  if (!props.item?.id) return;
  run({ id: props.item.id }, t("locales.restored", { name: name.value }));
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('locales.restoreTitle', { name })"
    :persistent="isPending"
    @cancel="cancel"
    @close="cancel"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-700 dark:text-neutral-200">
      {{ t("locales.restoreConfirm") }}
    </p>
  </ConfirmDialog>
</template>
