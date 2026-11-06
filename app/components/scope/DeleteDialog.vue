<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Scope } from "~/lib/api/schemas/parlance/v1/ScopeSchema";

const props = defineProps<{ open: boolean; item?: Scope }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const scopeStore = useScopeStore();
const { isPending, run, cancel } = useConfirmMutation(
  () => scopeStore.destroy,
  () => emit("close"),
);

function handleConfirm() {
  if (!props.item?.id) return;
  run(
    { id: props.item.id },
    t("scopes.deleted", { name: props.item.name ?? "" }),
  );
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('scopes.deleteTitle', { name: item?.name ?? '' })"
    :persistent="isPending"
    @cancel="cancel"
    @close="cancel"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-500 dark:text-neutral-400">
      {{ t("scopes.deleteConfirm") }}
    </p>
  </ConfirmDialog>
</template>
