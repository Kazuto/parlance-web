<script setup lang="ts">
import { Select } from "@thkzt/eunoia";

type Option = { label: string; value: string };

defineProps<{
  localeOptions: Option[];
  scopeOptions: Option[];
  statusOptions: Option[];
  disabled?: boolean;
  activeCount: number;
}>();

const localeIds = defineModel<string[]>("localeIds", { required: true });
const scopeIds = defineModel<string[]>("scopeIds", { required: true });
const status = defineModel<string>("status", { required: true });
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
  </EditorFiltersPopover>
</template>
