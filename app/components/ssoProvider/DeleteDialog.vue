<script setup lang="ts">
import { ConfirmDialog } from "@thkzt/eunoia";
import type { SsoProvider } from "~/lib/api/schemas/parlance/v1/SsoSchema";

const props = defineProps<{ open: boolean; item?: SsoProvider }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const store = useSsoProviderStore();
const { isPending, run, cancel } = useConfirmMutation(
  () => store.destroy,
  () => emit("close"),
);

function handleConfirm() {
  if (!props.item?.id) return;
  run(
    { id: props.item.id },
    t("ssoProviders.deleted", { name: props.item.name ?? "" }),
  );
}
</script>

<template>
  <ConfirmDialog
    :open
    :title="t('ssoProviders.deleteTitle', { name: item?.name ?? '' })"
    :persistent="isPending"
    @cancel="cancel"
    @close="cancel"
    @confirm="handleConfirm"
  >
    <p class="text-sm text-neutral-500 dark:text-neutral-400">
      {{ t("ssoProviders.deleteConfirm") }}
    </p>
  </ConfirmDialog>
</template>
