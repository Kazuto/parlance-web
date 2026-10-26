<script setup lang="ts">
import { ActionMenu, type ActionMenuItem, Icon, Tooltip } from "@thkzt/eunoia";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";

// The open entry's key, scopes and description, with its progress and actions.
defineProps<{
  label?: string;
  entry?: Entry;
  /** Scopes the list is filtered by. */
  activeScopeIds: string[];
  translatedCount: number;
  localeCount: number;
  isSaving: boolean;
  isTranslating: boolean;
  actions: ActionMenuItem[];
}>();

const emit = defineEmits<{
  toggleScope: [id: string];
  edit: [];
  action: [value: string];
}>();
const { t } = useI18n();

const copiedKey = ref<string>();
let copiedKeyTimer: ReturnType<typeof setTimeout> | undefined;

async function copyKey(key: string) {
  try {
    await navigator.clipboard.writeText(key);
  } catch {
    return;
  }

  copiedKey.value = key;
  clearTimeout(copiedKeyTimer);
  copiedKeyTimer = setTimeout(() => (copiedKey.value = undefined), 1500);
}
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 class="min-w-0 font-mono font-semibold break-all">
          <Tooltip
            v-if="label"
            :content="
              t(copiedKey === label ? 'common.copied' : 'entries.copyKey')
            "
          >
            <button
              type="button"
              class="cursor-pointer rounded-sm text-left transition-colors hover:text-primary-600 focus-visible:text-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 dark:hover:text-primary-400 dark:focus-visible:text-primary-400"
              :aria-label="`${label} – ${t('entries.copyKey')}`"
              @click="copyKey(label)"
            >
              {{ label }}
            </button>
          </Tooltip>
          <template v-else>{{ t("entries.selectEntry") }}</template>
        </h2>
        <div v-if="entry?.scopes?.length" class="flex flex-wrap gap-1">
          <ScopeChip
            v-for="scope in entry.scopes"
            :key="scope.id ?? undefined"
            dense
            :color="scope.color"
            :active="!!scope.id && activeScopeIds.includes(scope.id)"
            :title="
              t(
                scope.id && activeScopeIds.includes(scope.id)
                  ? 'entries.unfilterByScope'
                  : 'entries.filterByScope',
                { scope: scope.name },
              )
            "
            class="cursor-pointer"
            @click="scope.id && emit('toggleScope', scope.id)"
            >{{ scope.name }}</ScopeChip
          >
        </div>
        <button
          v-else-if="entry"
          v-can="'update_entry'"
          type="button"
          class="cursor-pointer text-xs text-neutral-400 hover:text-neutral-600 hover:underline dark:hover:text-neutral-300"
          :disabled="isSaving"
          @click="emit('edit')"
        >
          {{ t("entries.noScopes") }}
        </button>
      </div>
      <p
        v-if="entry?.description"
        class="mt-1 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400"
      >
        {{ entry.description }}
      </p>
    </div>
    <div v-if="entry" class="flex shrink-0 items-center gap-2">
      <span
        class="mr-1.5 text-[11.5px] font-semibold whitespace-nowrap text-neutral-500 dark:text-neutral-400"
        >{{
          t("entries.translatedCount", {
            done: translatedCount,
            total: localeCount,
          })
        }}</span
      >
      <span
        v-if="isTranslating"
        role="status"
        class="flex items-center gap-1 text-[11.5px] font-semibold whitespace-nowrap text-primary-600 dark:text-primary-300"
      >
        <Icon name="sparkle" size="xs" class="animate-pulse" />
        {{ t("entries.translating") }}
      </span>
      <ActionMenu
        v-if="actions.length"
        :items="actions"
        :label="t('entries.actions')"
        class="bg-neutral-100 dark:bg-white/5"
        @select="emit('action', $event)"
      />
    </div>
  </div>
</template>
