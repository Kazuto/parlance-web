<script setup lang="ts">
import { Icon } from "@thkzt/eunoia";
import { useTerminologySuggestions } from "~/composables/terminology/useTerminologySuggestions";

// Glossary terms in the source text and how this translation uses them, for the
// context panel's Glossary tab.
const props = defineProps<{
  sourceText: string;
  targetLocaleId: string;
  translation: string;
}>();
const { t } = useI18n();

const { matches, hasSource, isFetching, error, refetch } =
  useTerminologySuggestions(
    () => props.sourceText,
    () => props.targetLocaleId,
    () => props.translation,
  );

const copied = ref<string>();
const copyError = ref(false);

watch(
  () => [props.sourceText, props.targetLocaleId],
  () => {
    copied.value = undefined;
    copyError.value = false;
  },
);

async function copyTerm(term: string) {
  copyError.value = false;

  try {
    await navigator.clipboard.writeText(term);
    copied.value = term;
  } catch {
    copyError.value = true;
  }
}

const STATUS_COLORS = {
  untranslated: "text-primary-600 dark:text-primary-300",
  unused: "text-yellow-700 dark:text-amber-300",
  used: "text-green-600 dark:text-green-300",
};
</script>

<template>
  <div class="flex flex-col gap-2 text-xs">
    <p v-if="!hasSource" class="text-sm text-neutral-500 dark:text-neutral-400">
      {{ t("context.sourceRequired") }}
    </p>
    <p
      v-else-if="isFetching && !matches.length"
      role="status"
      class="text-neutral-500 dark:text-neutral-400"
    >
      {{ t("terminologyHints.loading") }}
    </p>
    <p v-else-if="error" role="status" class="text-neutral-500">
      {{ t("terminologyHints.unavailable") }}
      <button
        type="button"
        class="cursor-pointer underline"
        @click="() => refetch()"
      >
        {{ t("common.retry") }}
      </button>
    </p>
    <p
      v-else-if="!matches.length"
      class="text-sm text-neutral-500 dark:text-neutral-400"
    >
      {{ t("context.noTerms") }}
    </p>
    <template v-else>
      <span
        class="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400"
      >
        {{ t("terminologyHints.title") }} ·
        {{
          t(
            "terminologyHints.matches",
            { count: matches.length },
            matches.length,
          )
        }}
      </span>
      <ul
        class="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800"
      >
        <li
          v-for="(match, index) in matches"
          :key="match.terminology?.id ?? index"
          class="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0"
        >
          <div class="flex items-center gap-2">
            <!-- One line of text, so term, arrow and translation share a baseline and wrap together. -->
            <p
              class="min-w-0 flex-1 text-[13px] font-bold break-words dark:text-neutral-50"
            >
              <span>{{
                match.terminology?.term ?? match.matchedWords?.join(", ")
              }}</span>
              <Icon
                name="arrow-right"
                type="bold"
                size="xs"
                class="mx-1.5 -mt-px align-middle text-neutral-500 dark:text-neutral-300"
              />
              <span class="sr-only"> → </span>
              <span class="text-primary-700 dark:text-primary-500">{{
                match.targetTranslation
              }}</span>
              <span
                v-if="match.targetStatus === 'REVIEW_STATUS_DRAFT'"
                class="ml-1.5 rounded-[6px] bg-yellow-50 px-1.5 py-px align-middle text-[10.5px] font-bold text-yellow-700 squircle dark:bg-amber-400/15 dark:text-amber-300"
                :title="t('review.draftDefinitionHint')"
                >{{ t("review.draft") }}</span
              >
            </p>
            <!-- Icon only, so the term keeps the row's width in every language. -->
            <BaseIconButton
              dense
              :icon="copied === match.targetTranslation ? 'check' : 'copy'"
              :label="
                t(
                  copied === match.targetTranslation
                    ? 'common.copied'
                    : 'terminologyHints.copy',
                )
              "
              class="shrink-0 bg-neutral-100 text-neutral-600 dark:bg-white/5 dark:text-neutral-300"
              @click="copyTerm(match.targetTranslation ?? '')"
            />
          </div>
          <p
            v-if="match.terminology?.description"
            class="whitespace-pre-wrap text-neutral-500 dark:text-neutral-400"
          >
            {{ match.terminology.description }}
          </p>
          <p
            class="flex items-center gap-1.5 text-[11.5px] font-semibold"
            :class="STATUS_COLORS[match.status]"
          >
            <span class="size-1.5 rounded-full bg-current" />
            {{ t(`terminologyHints.status.${match.status}`) }}
          </p>
        </li>
      </ul>
      <NuxtLink
        to="/glossary"
        class="self-start py-0.5 text-xs font-semibold text-primary-600 no-underline hover:text-primary-700 dark:text-primary-500 dark:hover:text-primary-400"
      >
        {{ t("terminologyHints.glossary") }} →
      </NuxtLink>
      <p v-if="copyError" role="alert" class="text-red-600">
        {{ t("terminologyHints.copyFailed") }}
      </p>
    </template>
  </div>
</template>
