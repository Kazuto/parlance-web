<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Scope } from "~/lib/api/schemas/parlance/v1/ScopeSchema";

const props = defineProps<{ open: boolean; item?: Scope }>();
const emit = defineEmits<{ close: [] }>();
const scopeStore = useScopeStore();
const isPending = computed(() => scopeStore.restore.isPending);
const toast = useToast();
const { t } = useI18n();

async function handleConfirm() {
  if (!props.item?.id || isPending.value) return;
  const name = props.item.name ?? "";
  try {
    await scopeStore.restore.mutateAsync({ id: props.item.id });
    toast.add(t("scopes.restored", { name }), { variant: "success" });
    emit("close");
  } catch {
    toast.add(t("scopes.restoreFailed", { name }), { variant: "danger" });
  }
}

function handleClose() {
  if (!isPending.value) emit("close");
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('scopes.restoreTitle', { name: item?.name ?? '' })"
    :persistent="isPending"
    @cancel="handleClose"
    @close="handleClose"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-700 dark:text-neutral-200">
      {{ t("scopes.restoreConfirm") }}
    </p>
  </ConfirmDialog>
</template>
