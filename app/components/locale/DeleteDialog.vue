<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

const props = defineProps<{
  open: boolean;
  item?: Locale;
}>();

const localeStore = useLocaleStore();
const destroyLocale = localeStore.destroy.mutateAsync;
const isPending = computed(() => localeStore.destroy.isPending);

const { t } = useI18n();
const localeName = useLocaleName();
const name = computed(() => (props.item ? localeName(props.item) : ""));
const { showError, showSuccess } = useErrorHelper();

async function handleSubmit() {
  if (!props.item || isPending.value) return;
  const id = props.item.id;

  await destroyLocale(
    {
      id: props.item.id,
    },
    {
      onSuccess: () => {
        showSuccess(t("locales.deleted", { name: name.value }));
      },
      onError: (error) => {
        showError(error);
      },
    },
  );

  if (id) emit("deleted", id);

  handleClose();
}

const emit = defineEmits<{
  close: [];
  deleted: [id: string];
}>();

function handleClose() {
  if (!isPending.value) {
    emit("close");
  }
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('locales.deleteTitle', { name })"
    @cancel="handleClose"
    @close="handleClose"
    @confirm="handleSubmit"
  >
    <p class="text-sm text-neutral-700 dark:text-neutral-200">
      {{ t("locales.deleteConfirm") }}
    </p>
  </ConfirmDialog>
</template>
