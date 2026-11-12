<script setup lang="ts">
import { Button, Dialog } from "@thkzt/eunoia";
import type { Release } from "~/lib/api/schemas/parlance/v1/ReleaseSchema";

// Confirms letting a release out now, whatever its date.
const props = defineProps<{ open: boolean; item?: Release }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const releaseStore = useReleaseStore();
const { isPending, run, cancel } = useConfirmMutation(
  () => releaseStore.publish,
  () => emit("close"),
);
const count = computed(() => props.item?.entryCount ?? 0);

function handleConfirm() {
  if (!props.item?.id) return;
  run(
    { id: props.item.id },
    t("releases.published", { name: props.item.name ?? "" }),
  );
}
</script>

<template>
  <Dialog
    :open
    :title="t('releases.publishTitle', { name: item?.name ?? '' })"
    :persistent="isPending"
    @close="cancel"
  >
    <p class="text-sm text-neutral-500 dark:text-neutral-400">
      {{ t("releases.publishConfirm", { count }, count) }}
    </p>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="isPending" @click="cancel">
          {{ t("common.cancel") }}
        </Button>
        <Button
          primary
          icon="rocket-launch"
          :disabled="isPending"
          @click="handleConfirm"
        >
          {{ isPending ? t("releases.publishing") : t("releases.publish") }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
