<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Scope } from "~/lib/api/schemas/parlance/v1/ScopeSchema";

const props = defineProps<{ open: boolean; item?: Scope }>();
const emit = defineEmits<{ close: [] }>();
const scopeStore = useScopeStore();
const isPending = computed(() => scopeStore.destroy.isPending);
const toast = useToast();
const { t } = useI18n();

async function handleConfirm() {
  if (!props.item?.id || isPending.value) return;
  const name = props.item.name ?? "";
  try {
    await scopeStore.destroy.mutateAsync({ id: props.item.id });
    toast.add(t("scopes.deleted", { name }), { variant: "success" });
    emit("close");
  } catch {
    toast.add(t("scopes.deleteFailed", { name }), { variant: "danger" });
  }
}

function handleClose() {
  if (!isPending.value) emit("close");
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('scopes.deleteTitle', { name: item?.name ?? '' })"
    :persistent="isPending"
    @cancel="handleClose"
    @close="handleClose"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-500">
      {{ t("scopes.deleteConfirm") }}
    </p>
  </ConfirmDialog>
</template>
