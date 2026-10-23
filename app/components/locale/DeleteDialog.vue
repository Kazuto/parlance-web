<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

const props = defineProps<{ open: boolean; item?: Locale }>();
const emit = defineEmits<{ close: []; deleted: [id: string] }>();
const { t } = useI18n();
const localeName = useLocaleName();
const name = computed(() => (props.item ? localeName(props.item) : ""));
const localeStore = useLocaleStore();
const { isPending, run, cancel } = useConfirmMutation(
  () => localeStore.destroy,
  () => emit("close"),
);

async function handleConfirm() {
  const id = props.item?.id;

  if (!id) return;

  if (await run({ id }, t("locales.deleted", { name: name.value }))) {
    emit("deleted", id);
  }
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('locales.deleteTitle', { name })"
    :persistent="isPending"
    @cancel="cancel"
    @close="cancel"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-700 dark:text-neutral-200">
      {{ t("locales.deleteConfirm") }}
    </p>
  </ConfirmDialog>
</template>
