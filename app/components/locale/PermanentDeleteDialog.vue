<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

const props = defineProps<{
  open: boolean;
  item?: Locale;
}>();

const localeStore = useLocaleStore();
const permanentDeleteLocale = localeStore.permanentDelete.mutateAsync;
const isPending = computed(() => localeStore.permanentDelete.isPending);

const toast = useToast();
const { t } = useI18n();

async function handleSubmit() {
  if (!props.item || isPending.value) return;
  const id = props.item.id;

  await permanentDeleteLocale(
    {
      id: props.item.id,
    },
    {
      onSuccess: () => {
        toast.add(
          t("locales.permanentlyDeleted", { name: props.item?.name ?? "" }),
          {
            variant: "success",
          },
        );
      },
      onError: () => {
        toast.add(
          t("locales.permanentDeleteFailed", { name: props.item?.name ?? "" }),
          {
            variant: "danger",
          },
        );
      },
    },
  );

  if (id) emit("permanentlyDeleted", id);

  handleClose();
}

const emit = defineEmits<{
  close: [];
  permanentlyDeleted: [id: string];
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
    :title="t('locales.permanentDeleteTitle', { name: props.item?.name ?? '' })"
    @cancel="handleClose"
    @close="handleClose"
    @confirm="handleSubmit"
  >
    <p class="text-sm text-neutral-700 dark:text-neutral-200">
      {{ t("locales.permanentDeleteConfirm") }}
    </p>
    <p class="text-sm text-red-600 dark:text-red-400 font-semibold mt-2">
      {{ t("locales.permanentDeleteWarning") }}
    </p>
  </ConfirmDialog>
</template>
