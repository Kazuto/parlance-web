<script setup lang="ts">
import { Select } from "@thkzt/eunoia";

type Option = { label: string; value: string };

defineProps<{
  localeOptions: Option[];
  scopeOptions: Option[];
  /** The tags of the selected scopes */
  tagOptions: Option[];
  /** Releases to filter by; none hides the filter */
  releaseOptions: Option[];
  statusOptions: Option[];
  duplicateOptions: Option[];
  disabled?: boolean;
  activeCount: number;
}>();

const localeIds = defineModel<string[]>("localeIds", { required: true });
const scopeIds = defineModel<string[]>("scopeIds", { required: true });
const tagIds = defineModel<string[]>("tagIds", { required: true });
const releaseIds = defineModel<string[]>("releaseIds", { required: true });
const status = defineModel<string>("status", { required: true });
const duplicates = defineModel<string>("duplicates", { required: true });
const emit = defineEmits<{ clear: [] }>();

const { t } = useI18n();
</script>

<template>
  <EditorFiltersPopover
    v-model:locale-ids="localeIds"
    :locale-options
    :disabled
    :active-count
    @clear="emit('clear')"
  >
    <label class="flex flex-col gap-1">
      <span
        class="text-xs font-medium text-neutral-500 dark:text-neutral-400"
        >{{ t("nav.scopes") }}</span
      >
      <Select
        :model-value="scopeIds"
        dense
        multiple
        :options="scopeOptions"
        :placeholder="t('scopes.all')"
        :aria-label="t('nav.scopes')"
        @update:model-value="
          scopeIds = Array.isArray($event) ? $event.map(String) : []
        "
      />
    </label>

    <!-- Tags narrow scopes, so they are offered once scopes are picked. -->
    <label v-if="scopeIds.length" class="flex flex-col gap-1">
      <span
        class="text-xs font-medium text-neutral-500 dark:text-neutral-400"
        >{{ t("tags.title") }}</span
      >
      <Select
        :model-value="tagIds"
        dense
        multiple
        :options="tagOptions"
        :disabled="!tagOptions.length"
        :placeholder="t(tagOptions.length ? 'tags.all' : 'tags.noneInScopes')"
        :aria-label="t('tags.title')"
        @update:model-value="
          tagIds = Array.isArray($event) ? $event.map(String) : []
        "
      />
      <span
        v-if="tagOptions.length"
        class="text-xs text-neutral-500 dark:text-neutral-400"
        >{{ t("tags.filterHelp") }}</span
      >
    </label>

    <label v-if="releaseOptions.length" class="flex flex-col gap-1">
      <span
        class="text-xs font-medium text-neutral-500 dark:text-neutral-400"
        >{{ t("nav.releases") }}</span
      >
      <Select
        :model-value="releaseIds"
        dense
        multiple
        :options="releaseOptions"
        :placeholder="t('releases.all')"
        :aria-label="t('nav.releases')"
        @update:model-value="
          releaseIds = Array.isArray($event) ? $event.map(String) : []
        "
      />
    </label>

    <label class="flex flex-col gap-1">
      <span
        class="text-xs font-medium text-neutral-500 dark:text-neutral-400"
        >{{ t("entries.translationStatus") }}</span
      >
      <Select
        v-model="status"
        dense
        :options="statusOptions"
        :aria-label="t('entries.translationStatus')"
      />
      <span class="text-xs text-neutral-500 dark:text-neutral-400">{{
        t(
          localeIds.length
            ? "entries.filterSelectedHelp"
            : "entries.filterAllHelp",
        )
      }}</span>
    </label>

    <label class="flex flex-col gap-1">
      <span
        class="text-xs font-medium text-neutral-500 dark:text-neutral-400"
        >{{ t("entries.duplicates") }}</span
      >
      <Select
        v-model="duplicates"
        dense
        :options="duplicateOptions"
        :aria-label="t('entries.duplicates')"
      />
      <span class="text-xs text-neutral-500 dark:text-neutral-400">{{
        t("entries.duplicatesHelp")
      }}</span>
    </label>
  </EditorFiltersPopover>
</template>
