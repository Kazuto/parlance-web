<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { Release } from "~/lib/api/schemas/parlance/v1/ReleaseSchema";

const props = defineProps<{ open: boolean; item?: Release }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const releaseStore = useReleaseStore();
const { isPending, run, cancel } = useConfirmMutation(
  () => releaseStore.destroy,
  () => emit("close"),
);
const count = computed(() => props.item?.entryCount ?? 0);

function handleConfirm() {
  if (!props.item?.id) return;
  run(
    { id: props.item.id },
    t("releases.deleted", { name: props.item.name ?? "" }),
  );
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('releases.deleteTitle', { name: item?.name ?? '' })"
    :persistent="isPending"
    @cancel="cancel"
    @close="cancel"
    @confirm="handleConfirm"
  >
    <!-- A pending release's entries export again; a released one only loses its record. -->
    <p class="text-sm text-neutral-500 dark:text-neutral-400">
      {{
        item?.releasedAt
          ? t("releases.deleteReleased")
          : count
            ? t("releases.deletePending", { count }, count)
            : t("releases.deleteEmpty")
      }}
    </p>
  </ConfirmDialog>
</template>
