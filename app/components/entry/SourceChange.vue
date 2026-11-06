<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { textDirection } from "~/lib/textDirection";

// How the default text changed since the translation was written or approved: the
// text it was based on, the last one before it was marked outdated, next to the
// current one.
const props = defineProps<{
  entryId: string;
  sourceLocaleId: string;
  sourceLocaleName: string;
  sourceLocaleCode?: string;
  /** When the translation was marked outdated. */
  outdatedAt: string;
  /** The default text as it is now, unsaved edits included. */
  sourceText: string;
}>();
const { t } = useI18n();

const options = api.entries.history.use({
  entryId: computed(() => props.entryId),
  localeId: computed(() => props.sourceLocaleId),
  before: computed(() => props.outdatedAt),
  pagination: { page: 1, perPage: 1 },
});
// The text before a change never changes itself.
const { data, error, refetch } = useQuery({ ...options, staleTime: Infinity });

const before = computed(() => data.value?.history?.[0]?.translation ?? "");
const direction = computed(() =>
  props.sourceLocaleCode ? textDirection(props.sourceLocaleCode) : undefined,
);
</script>

<template>
  <section
    class="flex flex-col gap-2.5 rounded-2xl bg-orange-50 px-3.5 py-3 squircle dark:bg-orange-400/10"
    :aria-label="t('context.sourceChanged', { language: sourceLocaleName })"
  >
    <div class="flex flex-col gap-0.5">
      <span
        class="text-[12.5px] font-bold text-orange-800 dark:text-orange-200"
        >{{ t("context.sourceChanged", { language: sourceLocaleName }) }}</span
      >
      <span
        class="text-[12px] leading-relaxed text-orange-900/70 dark:text-orange-100/70"
        >{{ t("context.sourceChangedHint") }}</span
      >
    </div>
    <div class="flex flex-col gap-1">
      <span
        class="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400"
        >{{ t("context.sourceBefore") }}</span
      >
      <p
        v-if="error && !data"
        role="alert"
        class="text-[12.5px] text-red-600 dark:text-red-400"
      >
        {{ t("context.sourceBeforeFailed") }}
        <button
          type="button"
          class="cursor-pointer underline"
          @click="refetch()"
        >
          {{ t("common.retry") }}
        </button>
      </p>
      <p
        v-else-if="!data"
        role="status"
        class="text-[12.5px] text-neutral-500 dark:text-neutral-400"
      >
        {{ t("context.loadingHistory") }}
      </p>
      <span
        v-else-if="before.trim()"
        class="rounded-xl bg-white/70 px-2.5 py-2 text-[13px] leading-normal whitespace-pre-wrap text-neutral-600 line-through decoration-red-400/60 squircle dark:bg-black/20 dark:text-neutral-300"
        :dir="direction"
        >{{ before }}</span
      >
      <span
        v-else
        class="text-[12.5px] text-neutral-500 italic dark:text-neutral-400"
        >{{ t("context.sourceBeforeNone") }}</span
      >
    </div>
    <div class="flex flex-col gap-1">
      <span
        class="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400"
        >{{ t("context.sourceNow") }}</span
      >
      <span
        class="rounded-xl bg-white px-2.5 py-2 text-[13px] leading-normal whitespace-pre-wrap squircle dark:bg-black/30 dark:text-neutral-100"
        :dir="direction"
        >{{
          sourceText.trim() ? sourceText : t("context.emptyTranslation")
        }}</span
      >
    </div>
  </section>
</template>
