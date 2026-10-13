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

const toast = useToast();
const { t } = useI18n();

async function handleSubmit() {
  if (!props.item || isPending.value) return;
  const id = props.item.id;

  await destroyLocale(
    {
      id: props.item.id,
    },
    {
      onSuccess: () => {
        toast.add(t("locales.deleted", { name: props.item?.name ?? "" }), {
          variant: "success",
        });
      },
      onError: () => {
        toast.add(t("locales.deleteFailed", { name: props.item?.name ?? "" }), {
          variant: "danger",
        });
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
    :title="t('locales.deleteTitle', { name: props.item?.name ?? '' })"
    @cancel="handleClose"
    @close="handleClose"
    @confirm="handleSubmit"
  >
    <p class="text-sm text-neutral-500">
      {{ t("locales.deleteConfirm") }}
    </p>
  </ConfirmDialog>
</template>
