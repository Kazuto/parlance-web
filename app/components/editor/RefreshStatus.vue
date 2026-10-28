<script setup lang="ts">
// Reports a list refreshing in the background, or failing to, with a retry.
const props = defineProps<{
  refreshing: boolean;
  failed: boolean;
  refreshingLabel?: string;
  failedLabel?: string;
}>();
const emit = defineEmits<{ retry: [] }>();
const { t } = useI18n();
</script>

<template>
  <span
    v-if="refreshing"
    role="status"
    class="ml-auto text-xs text-neutral-500 dark:text-neutral-400"
  >
    {{ props.refreshingLabel ?? t("common.refreshing") }}
  </span>
  <span v-else-if="failed" role="alert" class="ml-auto text-xs text-red-600">
    {{ props.failedLabel ?? t("common.refreshFailed") }}
    <button
      type="button"
      class="cursor-pointer underline"
      @click="emit('retry')"
    >
      {{ t("common.retry") }}
    </button>
  </span>
</template>
