<script setup lang="ts">
import { Button, Icon } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { refDebounced } from "@vueuse/core";
import { api } from "~/lib/api";

const props = defineProps<{
  sourceText: string;
  targetLocaleId: string;
  translation: string;
  compact?: boolean;
  panel?: boolean;
}>();
const emit = defineEmits<{ open: [] }>();
const { t } = useI18n();
const source = computed(() => props.sourceText.trim());
const debouncedSource = refDebounced(source, 400);
const targetLocaleId = computed(() => props.targetLocaleId);
const options = api.terminologies.suggest.use({
  sourceText: debouncedSource,
  targetLocaleId,
});
const { data, isFetching, error, refetch } = useQuery({
  ...options,
  enabled: computed(
    () =>
      toValue(options.enabled) &&
      !!debouncedSource.value &&
      source.value === debouncedSource.value &&
      !!targetLocaleId.value,
  ),
  staleTime: 5 * 60 * 1000,
  retry: false,
});
const suggestions = computed(() =>
  source.value === debouncedSource.value
    ? (data.value?.suggestions ?? []).filter((suggestion) =>
        suggestion.targetTranslation?.trim(),
      )
    : [],
);
const expanded = ref<string>();
const copied = ref<string>();
const copyError = ref(false);
watch([source, targetLocaleId], () => {
  expanded.value = undefined;
  copied.value = undefined;
  copyError.value = false;
});

function termUsed(term: string) {
  const normalized = props.translation.normalize("NFKC").toLocaleLowerCase();
  const needle = term.normalize("NFKC").toLocaleLowerCase();
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,
    "u",
  ).test(normalized);
}

async function copyTerm(term: string) {
  copyError.value = false;
  try {
    await navigator.clipboard.writeText(term);
    copied.value = term;
  } catch {
    copyError.value = true;
  }
}
</script>

<template>
  <div
    v-if="panel || (source && (suggestions.length || isFetching || error))"
    class="mt-2 space-y-2 text-xs"
  >
    <div class="flex flex-wrap items-center gap-2 text-neutral-500">
      <button
        v-if="compact"
        type="button"
        class="cursor-pointer text-primary-600 hover:underline"
        @click="emit('open')"
      >
        {{ t("terminologyHints.title") }} ·
        {{
          t(
            "terminologyHints.matches",
            { count: suggestions.length },
            suggestions.length,
          )
        }}
      </button>
      <template v-else>
        <span class="font-medium">{{ t("terminologyHints.title") }}</span>
        <span v-if="isFetching" role="status">{{
          t("terminologyHints.loading")
        }}</span>
        <span v-else-if="error" role="status">
          {{ t("terminologyHints.unavailable") }}
          <button type="button" class="underline" @click="() => refetch()">
            {{ t("common.retry") }}
          </button>
        </span>
        <span v-else>{{
          t(
            "terminologyHints.matches",
            { count: suggestions.length },
            suggestions.length,
          )
        }}</span>
      </template>
    </div>
    <p v-if="panel && !source" class="text-sm text-neutral-500">
      {{ t("context.sourceRequired") }}
    </p>
    <p
      v-else-if="panel && !suggestions.length && !isFetching && !error"
      class="text-sm text-neutral-500"
    >
      {{ t("context.noTerms") }}
    </p>
    <div v-if="!compact && !panel" class="flex flex-wrap gap-2">
      <button
        v-for="(suggestion, index) in suggestions"
        :key="suggestion.terminology?.id ?? index"
        type="button"
        class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-neutral-700 hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
        :aria-expanded="expanded === String(index)"
        :aria-label="
          t('terminologyHints.termLabel', {
            source: suggestion.terminology?.term ?? '',
            target: suggestion.targetTranslation ?? '',
            state: t(
              termUsed(suggestion.targetTranslation ?? '')
                ? 'terminologyHints.used'
                : 'terminologyHints.preferred',
            ),
          })
        "
        @click="
          expanded = expanded === String(index) ? undefined : String(index)
        "
      >
        <span>{{
          suggestion.terminology?.term ?? suggestion.matchedWords?.join(", ")
        }}</span>
        <span aria-hidden="true">→</span>
        <span class="font-medium">{{ suggestion.targetTranslation }}</span>
        <Icon
          v-if="termUsed(suggestion.targetTranslation ?? '')"
          name="check"
          size="sm"
          class="text-green-600"
        />
      </button>
    </div>
    <template
      v-for="(suggestion, index) in suggestions"
      :key="suggestion.terminology?.id ?? index"
    >
      <div
        v-if="!compact && (panel || expanded === String(index))"
        class="rounded-md border border-neutral-200 p-3 dark:border-neutral-700"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm font-medium">
            {{ suggestion.terminology?.term }} →
            {{ suggestion.targetTranslation }}
          </p>
          <Button
            type="button"
            ghost
            icon="copy"
            @click="copyTerm(suggestion.targetTranslation ?? '')"
          >
            {{
              t(
                copied === suggestion.targetTranslation
                  ? "terminologyHints.copied"
                  : "terminologyHints.copy",
              )
            }}
          </Button>
        </div>
        <p
          v-if="suggestion.terminology?.description"
          class="mt-2 whitespace-pre-wrap text-neutral-500"
        >
          {{ suggestion.terminology.description }}
        </p>
        <p class="mt-2 text-neutral-500">
          {{
            t(
              termUsed(suggestion.targetTranslation ?? "")
                ? "terminologyHints.usedHint"
                : "terminologyHints.preferredHint",
            )
          }}
        </p>
        <NuxtLink
          to="/terminologies"
          class="mt-2 inline-block text-primary-600 underline"
          >{{ t("terminologyHints.glossary") }}</NuxtLink
        >
        <p v-if="copyError" role="alert" class="mt-2 text-red-600">
          {{ t("terminologyHints.copyFailed") }}
        </p>
      </div>
    </template>
  </div>
</template>
