<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Terminology } from "~/lib/api/schemas/parlance/v1/TerminologySchema";

const props = defineProps<{
  open: boolean;
  item?: Terminology;
}>();
const emit = defineEmits<{ close: []; deleted: [id: string] }>();

const terminologyStore = useTerminologyStore();
const { mutateAsync: deleteTerminology, isPending } = terminologyStore.destroy;
const toast = useToast();
const { t } = useI18n();

async function handleConfirm() {
  if (!props.item?.id || isPending) return;
  try {
    await deleteTerminology({ id: props.item.id });
    toast.add(t("terminologies.deleted", { term: props.item.term ?? "" }), {
      variant: "success",
    });
    emit("deleted", props.item.id);
    emit("close");
  } catch {
    toast.add(
      t("terminologies.deleteFailed", { term: props.item.term ?? "" }),
      {
        variant: "danger",
      },
    );
  }
}

function handleClose() {
  if (!isPending) emit("close");
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('terminologies.deleteTitle', { term: props.item?.term ?? '' })"
    :confirm-phrase="
      t('terminologies.deleteConfirm', { term: props.item?.term ?? '' })
    "
    @cancel="handleClose"
    @close="handleClose"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-500">
      {{ t("terminologies.deleteWarning") }}
    </p>
  </ConfirmDialog>
</template>
