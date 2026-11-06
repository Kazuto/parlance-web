<script setup lang="ts">
import { Icon } from "@thkzt/eunoia";
import { useTranslationMemory } from "~/composables/editor/useTranslationMemory";
import type { TranslationMemoryMatch } from "~/lib/api/schemas/parlance/v1/LocalizationSchema";
import { textDirection } from "~/lib/textDirection";

// How similar default texts were translated into this language, for the context
// panel's Memory tab. Each match shows how alike its default text is to this entry's,
// and its translation can replace the field's text.
const props = defineProps<{
  entryId: string;
  sourceText: string;
  sourceLocaleName: string;
  sourceLocaleCode?: string;
  targetLocaleId: string;
  localeName: string;
  localeCode?: string;
  /** The field's text; a match with the same text offers nothing to use. */
  current: string;
  canUse?: boolean;
}>();
const emit = defineEmits<{ use: [text: string] }>();
const { t, locale } = useI18n();

const { matches, hasSource, isPending, error, refetch } = useTranslationMemory(
  () => props.sourceText,
  () => props.targetLocaleId,
  () => props.entryId,
);

const percent = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      style: "percent",
      maximumFractionDigits: 0,
    }),
);
const sourceDirection = computed(() =>
  props.sourceLocaleCode ? textDirection(props.sourceLocaleCode) : undefined,
);
const direction = computed(() =>
  props.localeCode ? textDirection(props.localeCode) : undefined,
);

// From 0.6 to 1; JSON may carry a float as a string.
const similarity = (match: TranslationMemoryMatch) =>
  Number(match.similarity ?? 0);

// The field has this translation already.
const used = (match: TranslationMemoryMatch) =>
  !!match.translation && match.translation === props.current;

const usable = (match: TranslationMemoryMatch) =>
  props.canUse && !!match.translation && !used(match);
</script>

<template>
  <div class="flex flex-col gap-2">
    <p v-if="!hasSource" class="text-sm text-neutral-500 dark:text-neutral-400">
      {{ t("context.memorySourceRequired") }}
    </p>
    <p
      v-else-if="error && !matches.length && !isPending"
      role="status"
      class="text-sm text-neutral-500 dark:text-neutral-400"
    >
      {{ t("context.memoryFailed") }}
      <button
        type="button"
        class="cursor-pointer underline"
        @click="() => refetch()"
      >
        {{ t("common.retry") }}
      </button>
    </p>
    <p
      v-else-if="isPending && !matches.length"
      role="status"
      class="text-sm text-neutral-500 dark:text-neutral-400"
    >
      {{ t("context.memoryLoading") }}
    </p>
    <p
      v-else-if="!matches.length"
      class="text-sm text-neutral-500 dark:text-neutral-400"
    >
      {{ t("context.noMemory") }}
    </p>
    <!-- Each match is a pair: its default text, then its translation, each marked
         with its language's code. The header row has the button's height, so it's
         the same with or without one. -->
    <ol
      v-else
      class="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800"
      :aria-label="t('context.memory')"
    >
      <li
        v-for="match in matches"
        :key="match.entryId ?? match.key ?? ''"
        class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-2 gap-y-1 py-2.5 first:pt-0 last:pb-0"
      >
        <span
          class="col-span-2 min-h-6.5 content-center self-center truncate font-mono text-[11px] text-neutral-500 dark:text-neutral-400"
          :title="match.key ?? ''"
          >{{ match.key }}</span
        >
        <BaseIconButton
          v-if="usable(match)"
          dense
          class="self-center"
          icon="arrow-square-in"
          :label="t('context.useMatch')"
          @click="emit('use', match.translation ?? '')"
        />
        <span
          v-else-if="used(match)"
          class="flex items-center gap-1 self-center text-[11px] font-semibold text-green-700 dark:text-green-300"
        >
          <Icon name="check" size="xs" />
          {{ t("context.memoryAlreadyUsed") }}
        </span>
        <abbr
          class="col-start-1 font-mono text-[10px] text-neutral-500 no-underline dark:text-neutral-400"
          :title="sourceLocaleName"
          >{{ sourceLocaleCode }}</abbr
        >
        <p
          class="text-[12.5px] break-words whitespace-pre-wrap text-neutral-500 dark:text-neutral-400"
          :dir="sourceDirection"
        >
          {{ match.sourceText }}
        </p>
        <!-- The percentage compares the default texts, so it ends that line. -->
        <span
          class="justify-self-end rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums squircle"
          :class="
            similarity(match) >= 0.995
              ? 'bg-green-50 text-green-700 dark:bg-green-400/15 dark:text-green-300'
              : 'bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300'
          "
          :title="t('context.memorySimilarity', { language: sourceLocaleName })"
          >{{ percent.format(similarity(match)) }}</span
        >
        <abbr
          class="col-start-1 font-mono text-[10px] text-neutral-500 no-underline dark:text-neutral-400"
          :title="localeName"
          >{{ localeCode }}</abbr
        >
        <p
          class="col-span-2 text-sm break-words whitespace-pre-wrap dark:text-neutral-100"
          :dir="direction"
        >
          {{ match.translation }}
        </p>
      </li>
    </ol>
  </div>
</template>
