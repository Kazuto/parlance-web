<script setup lang="ts">
import { useSimilarEntries } from "~/composables/editor/useSimilarEntries";
import type { SimilarEntry } from "~/lib/api/schemas/parlance/v1/EntrySchema";
import { textDirection } from "~/lib/textDirection";

// Other entries with the same or a similar default text, for the context panel's
// Memory tab on the default language: twins to reuse before writing another. Each
// shows how alike its text is, and opens in the editor.
const props = defineProps<{
  entryId: string;
  /** The field's text, unsaved changes included. */
  text: string;
  localeCode?: string;
}>();
const emit = defineEmits<{ open: [entry: { id: string; key: string }] }>();
const { t, locale } = useI18n();

const { entries, hasText, isPending, error, refetch } = useSimilarEntries(
  () => props.text,
  () => props.entryId,
);

const percent = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      style: "percent",
      maximumFractionDigits: 0,
    }),
);
const direction = computed(() =>
  props.localeCode ? textDirection(props.localeCode) : undefined,
);

// From 0.8 to 1; JSON may carry a float as a string.
const similarity = (entry: SimilarEntry) => Number(entry.similarity ?? 0);
</script>

<template>
  <div class="flex flex-col gap-3">
    <p v-if="!hasText" class="text-sm text-neutral-500 dark:text-neutral-400">
      {{ t("context.similarTextRequired") }}
    </p>
    <p
      v-else-if="error && !entries.length && !isPending"
      role="status"
      class="text-sm text-neutral-500 dark:text-neutral-400"
    >
      {{ t("context.similarFailed") }}
      <button
        type="button"
        class="cursor-pointer underline"
        @click="() => refetch()"
      >
        {{ t("common.retry") }}
      </button>
    </p>
    <p
      v-else-if="isPending && !entries.length"
      role="status"
      class="text-sm text-neutral-500 dark:text-neutral-400"
    >
      {{ t("context.similarLoading") }}
    </p>
    <p
      v-else-if="!entries.length"
      class="text-sm text-neutral-500 dark:text-neutral-400"
    >
      {{ t("context.noSimilar") }}
    </p>
    <!-- Each entry: its key with the button to open it, then its text, which the
         percentage compares, so it ends that line. -->
    <ol
      v-else
      class="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800"
      :aria-label="t('context.similar')"
    >
      <li
        v-for="entry in entries"
        :key="entry.entryId ?? entry.key ?? ''"
        class="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 gap-y-1 py-2.5 first:pt-0 last:pb-0"
      >
        <span
          class="min-h-6.5 content-center self-center truncate font-mono text-[11px] text-neutral-500 dark:text-neutral-400"
          :title="entry.key ?? ''"
          >{{ entry.key }}</span
        >
        <BaseIconButton
          dense
          class="self-center"
          icon="arrow-right"
          :label="t('context.openSimilar', { key: entry.key ?? '' })"
          @click="
            emit('open', { id: entry.entryId ?? '', key: entry.key ?? '' })
          "
        />
        <p
          class="text-[12.5px] break-words whitespace-pre-wrap dark:text-neutral-100"
          :dir="direction"
        >
          {{ entry.text }}
        </p>
        <span
          class="justify-self-end rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums squircle"
          :class="
            similarity(entry) >= 0.995
              ? 'bg-yellow-100 text-yellow-700 dark:bg-amber-400/15 dark:text-amber-200'
              : 'bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300'
          "
          :title="t('context.similarSimilarity')"
          >{{ percent.format(similarity(entry)) }}</span
        >
      </li>
    </ol>
    <p
      class="text-[12.5px] leading-relaxed text-neutral-500 dark:text-neutral-400"
    >
      {{ t("context.memoryDefaultHint") }}
    </p>
  </div>
</template>
