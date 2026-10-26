<script setup lang="ts">
import type {
  ImportChangeAction,
  ImportResult,
} from "~/lib/api/schemas/parlance/v1/ImportSchema";
import type { Formality } from "~/lib/api/schemas/parlance/v1/LocaleSchema";
import { textDirection } from "~/lib/textDirection";

// What an import would do, from its dry run: how many translations it adds, changes
// and removes, which translations in other languages it outdates, and the first
// changes with their old and new text.
const props = defineProps<{
  result: ImportResult;
  /** The language imported into, for the writing direction of the texts. */
  localeCode?: string;
  /** Its form of address, which the checks compare the texts with. */
  formality?: Formality | null;
  /** One file of a ZIP, whose other files may update the outdated translations. */
  inZip?: boolean;
}>();
const { t } = useI18n();

const ACTIONS: Partial<
  Record<ImportChangeAction, { label: string; class: string }>
> = {
  IMPORT_CHANGE_ACTION_ADD: {
    label: "importPreview.added",
    class:
      "bg-green-50 text-green-700 dark:bg-green-400/15 dark:text-green-300",
  },
  IMPORT_CHANGE_ACTION_CHANGE: {
    label: "importPreview.changed",
    class:
      "bg-primary-50 text-primary-700 dark:bg-primary-400/15 dark:text-primary-300",
  },
  IMPORT_CHANGE_ACTION_REMOVE: {
    label: "importPreview.removed",
    class: "bg-red-50 text-red-700 dark:bg-rose-500/15 dark:text-rose-300",
  },
};
const NEUTRAL =
  "bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300";

const changes = computed(() => props.result.changes ?? []);
const direction = computed(() =>
  props.localeCode ? textDirection(props.localeCode) : undefined,
);
const outdated = computed(() => props.result.translationsOutdated ?? 0);

const totals = computed(() => {
  const added = props.result.translationsAdded ?? 0;
  const changed = props.result.translationsChanged ?? 0;
  const removed = props.result.translationsRemoved ?? 0;
  // Created and updated count every imported translation, unchanged ones too.
  const unchanged =
    (props.result.entriesCreated ?? 0) +
    (props.result.entriesUpdated ?? 0) -
    added -
    changed;

  return {
    changes: added + changed + removed,
    chips: [
      { ...ACTIONS.IMPORT_CHANGE_ACTION_ADD!, count: added },
      { ...ACTIONS.IMPORT_CHANGE_ACTION_CHANGE!, count: changed },
      { ...ACTIONS.IMPORT_CHANGE_ACTION_REMOVE!, count: removed },
      { label: "importPreview.unchanged", class: NEUTRAL, count: unchanged },
      {
        label: "importPreview.skipped",
        class: NEUTRAL,
        count: props.result.entriesSkipped ?? 0,
      },
      {
        label: "importPreview.failed",
        class: ACTIONS.IMPORT_CHANGE_ACTION_REMOVE!.class,
        count: props.result.entriesFailed ?? 0,
      },
    ].filter((chip) => chip.count > 0),
  };
});
const unlisted = computed(() => totals.value.changes - changes.value.length);
</script>

<template>
  <div class="flex flex-col gap-3">
    <ul class="flex flex-wrap gap-1.5">
      <li
        v-for="chip in totals.chips"
        :key="chip.label"
        class="flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-xs font-semibold squircle"
        :class="chip.class"
      >
        {{ t(chip.label) }}
        <span class="font-bold tabular-nums">{{ chip.count }}</span>
      </li>
    </ul>
    <p
      v-if="!totals.changes"
      class="text-sm text-neutral-500 dark:text-neutral-400"
    >
      {{ t("importPreview.nothing") }}
    </p>
    <p
      v-if="outdated"
      class="rounded-xl bg-orange-50 px-3 py-2 text-xs leading-relaxed text-orange-800 squircle dark:bg-orange-400/10 dark:text-orange-200"
    >
      {{ t("importPreview.outdated", { count: outdated }, outdated) }}
      <template v-if="inZip">{{ t("importPreview.zipOutdated") }}</template>
    </p>
    <ol
      v-if="changes.length"
      class="flex max-h-72 flex-col divide-y divide-neutral-200 overflow-y-auto dark:divide-neutral-800"
      :aria-label="t('importPreview.changes')"
    >
      <li
        v-for="change in changes"
        :key="change.key ?? ''"
        class="flex flex-col gap-1 py-2 first:pt-0 last:pb-0"
      >
        <div class="flex min-w-0 items-center gap-2">
          <span
            class="truncate font-mono text-[11px] text-neutral-500 dark:text-neutral-400"
            :title="change.key ?? ''"
            >{{ change.key }}</span
          >
          <span
            v-if="change.action && ACTIONS[change.action]"
            class="shrink-0 rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-bold squircle"
            :class="ACTIONS[change.action]!.class"
            >{{ t(ACTIONS[change.action]!.label) }}</span
          >
          <EditorQaNotice
            v-if="change.sourceTranslation && change.newTranslation"
            :source="change.sourceTranslation"
            :value="change.newTranslation"
            :target="{ code: localeCode, formality }"
          />
        </div>
        <p
          v-if="change.action !== 'IMPORT_CHANGE_ACTION_ADD'"
          class="text-[12.5px] break-words whitespace-pre-wrap text-neutral-500 line-through decoration-red-400/60 dark:text-neutral-400"
          :dir="change.oldTranslation ? direction : undefined"
        >
          {{ change.oldTranslation || t("context.emptyTranslation") }}
        </p>
        <p
          v-if="change.action !== 'IMPORT_CHANGE_ACTION_REMOVE'"
          class="text-sm break-words whitespace-pre-wrap dark:text-neutral-100"
          :dir="change.newTranslation ? direction : undefined"
        >
          {{ change.newTranslation || t("context.emptyTranslation") }}
        </p>
      </li>
    </ol>
    <p
      v-if="unlisted > 0"
      class="text-xs text-neutral-500 dark:text-neutral-400"
    >
      {{ t("importPreview.more", { count: unlisted }, unlisted) }}
    </p>
    <ul
      v-if="result.errors?.length"
      class="max-h-40 overflow-y-auto text-sm text-red-600"
    >
      <li v-for="(item, index) in result.errors" :key="index">
        {{ item.key }}: {{ item.message }}
      </li>
    </ul>
  </div>
</template>
