<script setup lang="ts">
import type { ImportDeletion } from "~/lib/api/schemas/parlance/v1/ImportSchema";
import { textDirection } from "~/lib/textDirection";

// The entries an import deletes because its file doesn't hold them, from its dry run:
// how many, and the first ones with their default texts. Entries other scopes keep
// only leave the import's scopes.
const props = defineProps<{
  deletion: ImportDeletion;
  /** The default language, for the writing direction of the texts. */
  localeCode?: string;
}>();
const { t } = useI18n();

const DELETED = "bg-red-50 text-red-700 dark:bg-rose-500/15 dark:text-rose-300";
const NEUTRAL =
  "bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300";

const entries = computed(() => props.deletion.entries ?? []);
const direction = computed(() =>
  props.localeCode ? textDirection(props.localeCode) : undefined,
);
const chips = computed(() =>
  [
    {
      label: "importPreview.deleted",
      class: DELETED,
      count: props.deletion.entriesDeleted ?? 0,
    },
    {
      label: "importPreview.unscoped",
      class: NEUTRAL,
      count: props.deletion.entriesUnscoped ?? 0,
    },
  ].filter((chip) => chip.count > 0),
);
const unlisted = computed(
  () =>
    chips.value.reduce((sum, chip) => sum + chip.count, 0) -
    entries.value.length,
);
</script>

<template>
  <section
    v-if="chips.length"
    class="flex flex-col gap-3"
    :aria-label="t('importPreview.deletion')"
  >
    <h3 class="text-sm font-bold dark:text-neutral-100">
      {{ t("importPreview.deletion") }}
    </h3>
    <ul class="flex flex-wrap gap-1.5">
      <li
        v-for="chip in chips"
        :key="chip.label"
        class="flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-xs font-semibold squircle"
        :class="chip.class"
      >
        {{ t(chip.label) }}
        <span class="font-bold tabular-nums">{{ chip.count }}</span>
      </li>
    </ul>
    <ol
      v-if="entries.length"
      class="flex max-h-72 flex-col divide-y divide-neutral-200 overflow-y-auto dark:divide-neutral-800"
    >
      <li
        v-for="entry in entries"
        :key="entry.key ?? ''"
        class="flex flex-col gap-1 py-2 first:pt-0 last:pb-0"
      >
        <div class="flex min-w-0 items-center gap-2">
          <span
            class="truncate font-mono text-[11px] text-neutral-500 dark:text-neutral-400"
            :title="entry.key ?? ''"
            >{{ entry.key }}</span
          >
          <span
            class="shrink-0 rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-bold squircle"
            :class="entry.unscoped ? NEUTRAL : DELETED"
            >{{
              t(
                entry.unscoped
                  ? "importPreview.unscoped"
                  : "importPreview.deleted",
              )
            }}</span
          >
        </div>
        <p
          class="text-[12.5px] break-words whitespace-pre-wrap text-neutral-500 dark:text-neutral-400"
          :class="{
            'line-through decoration-red-400/60': !entry.unscoped,
          }"
          :dir="entry.sourceTranslation ? direction : undefined"
        >
          {{ entry.sourceTranslation || t("context.emptyTranslation") }}
        </p>
      </li>
    </ol>
    <p
      v-if="unlisted > 0"
      class="text-xs text-neutral-500 dark:text-neutral-400"
    >
      {{ t("importPreview.deletionMore", { count: unlisted }, unlisted) }}
    </p>
  </section>
</template>
