<script setup lang="ts">
import { Button, Icon } from "@thkzt/eunoia";

// Actions on the entries ticked in the list.
defineProps<{
  count: number;
  loadedCount: number;
  allLoadedChecked: boolean;
  maxEntries: number;
  limitReached: boolean;
  isSaving: boolean;
  isTranslating: boolean;
  canTranslate: boolean;
  translateBlocker?: string;
  /** The running bulk translation, if any. */
  progress?: { done: number; total: number; stop: boolean };
  /** The user may approve the ticked entries' drafts. */
  canApprove?: boolean;
  isReviewing?: boolean;
}>();

const emit = defineEmits<{
  checkLoaded: [];
  clear: [];
  translate: [];
  stopTranslate: [];
  editScopes: [];
  approve: [];
}>();
const { t } = useI18n();
</script>

<template>
  <div
    class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-primary-200 bg-primary-50/60 px-4 py-1.5 text-sm text-neutral-900 dark:border-primary-800 dark:bg-primary-950/30 dark:text-neutral-100"
    role="region"
    :aria-label="t('entries.bulkActions')"
  >
    <span class="font-medium" aria-live="polite">{{
      t("entries.bulkSelected", { count: count }, count)
    }}</span>
    <Button
      v-if="!allLoadedChecked"
      type="button"
      ghost
      dense
      :disabled="isSaving"
      @click="emit('checkLoaded')"
    >
      {{ t("entries.bulkSelectLoaded", { count: loadedCount }) }}
    </Button>
    <Button
      type="button"
      ghost
      dense
      :disabled="isSaving"
      @click="emit('clear')"
    >
      {{ t("entries.bulkClear") }}
    </Button>
    <span v-if="limitReached" role="alert" class="text-xs text-red-600">
      {{ t("entries.bulkLimit", { max: maxEntries }) }}
    </span>
    <span
      v-if="progress"
      role="status"
      class="ml-auto flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-300"
    >
      <Icon name="sparkle" size="xs" class="animate-pulse" />
      {{
        t("entries.bulkTranslateProgress", {
          done: progress.done,
          total: progress.total,
        })
      }}
    </span>
    <Button
      v-if="progress"
      type="button"
      ghost
      dense
      :disabled="progress.stop"
      @click="emit('stopTranslate')"
    >
      {{ t("entries.bulkTranslateStop") }}
    </Button>
    <Button
      v-else-if="canTranslate"
      type="button"
      ghost
      dense
      icon="sparkle"
      class="ml-auto"
      :title="translateBlocker"
      :disabled="isSaving || isTranslating || !!translateBlocker"
      @click="emit('translate')"
    >
      {{ t("entries.bulkTranslate") }}
    </Button>
    <Button
      v-if="canApprove"
      type="button"
      ghost
      dense
      icon="seal-check"
      :class="{ 'ml-auto': !progress && !canTranslate }"
      :title="t('review.approveTickedHint')"
      :disabled="isSaving || isReviewing || limitReached"
      @click="emit('approve')"
    >
      {{ t("review.approveTicked") }}
    </Button>
    <Button
      type="button"
      primary
      dense
      icon="stack"
      :class="{ 'ml-auto': !progress && !canTranslate && !canApprove }"
      :disabled="isSaving || limitReached"
      @click="emit('editScopes')"
    >
      {{ t("entries.bulkEditScopes") }}
    </Button>
  </div>
</template>
