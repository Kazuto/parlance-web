<script setup lang="ts">
import { Alert, Button, Dialog, Select } from "@thkzt/eunoia";
import { useMutation } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { useTranslationDataInvalidation } from "~/lib/api/invalidation";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

// Marks translations for the machine translation tasks to translate again: a
// language's, e.g. after switching models, or the ticked entries' in the shown
// languages. Each text stays, in exports too, until a task replaces it with a draft.
const props = defineProps<{
  open: boolean;
  locales: Locale[];
  /** Only these entries' translations; without them, every entry's in the scopes. */
  entryIds?: string[];
}>();
const emit = defineEmits<{ close: [] }>();

const { t, locale: uiLocale } = useI18n();
const { showSuccess, getErrorMessage } = useErrorHelper();
const localeName = useLocaleName();
const invalidateTranslationData = useTranslationDataInvalidation();
const forEntries = computed(() => !!props.entryIds?.length);
const title = computed(() => {
  const count = props.entryIds?.length ?? 0;

  return forEntries.value
    ? t("entries.retranslateTitle", { count }, count)
    : t("locales.retranslateTitle", {
        language: props.locales[0] ? localeName(props.locales[0]) : "",
      });
});
const languages = computed(() =>
  new Intl.ListFormat(uiLocale.value).format(props.locales.map(localeName)),
);

const texts = ref<"machine" | "all">("machine");
const scopeIds = ref<string[]>([]);
const {
  options: scopeOptions,
  error: scopeError,
  isFetching: scopesLoading,
} = useScopeOptions();
const textOptions = computed(() => [
  { label: t("locales.retranslateMachine"), value: "machine" },
  { label: t("locales.retranslateAll"), value: "all" },
]);

// One call per language, the counts added up.
const { mutationFn: retranslateFn } = api.localizations.retranslate.use();

async function each(changes: { cancel?: boolean; dryRun?: boolean }) {
  const responses = await Promise.all(
    props.locales.map((locale) =>
      retranslateFn({ ...request(locale), ...changes }),
    ),
  );

  return {
    count: responses.reduce((sum, { count }) => sum + (count ?? 0), 0),
    pending: responses.reduce((sum, { pending }) => sum + (pending ?? 0), 0),
  };
}

// Dry runs count what the choice marks, and what is marked already.
const preview = useMutation({ mutationFn: each });
const apply = useMutation({
  mutationFn: each,
  onSuccess: () => invalidateTranslationData(),
});
const counts = ref<{ count: number; pending: number }>();

const { error, isPending, submit, cancel } = useFormDialog({
  open: () => props.open,
  isPending: () => apply.isPending.value,
  reset: () => {
    texts.value = "machine";
    scopeIds.value = [];
    counts.value = undefined;
  },
  close: () => emit("close"),
});

function request(locale: Locale) {
  return {
    localeId: locale.id ?? "",
    ...(forEntries.value
      ? { entryIds: [...props.entryIds!] }
      : { scopeIds: [...scopeIds.value] }),
    includeHuman: texts.value === "all",
  };
}

// The open dialog's dry run, which changes only with the choice
const dryRun = computed(() =>
  props.open && props.locales.length
    ? JSON.stringify(props.locales.map(request))
    : undefined,
);
// Only the latest choice's counts show.
let latest = 0;

watch(
  dryRun,
  async (body) => {
    if (!body) return;

    const call = ++latest;

    try {
      const response = await preview.mutateAsync({ dryRun: true });

      if (call === latest) counts.value = response;
    } catch (cause) {
      if (call === latest) error.value = getErrorMessage(cause);
    }
  },
  { immediate: true },
);

function retranslate() {
  submit(async () => {
    const { count } = await apply.mutateAsync({});

    showSuccess(t("locales.retranslated", { count }, count));
  });
}

function takeBack() {
  submit(async () => {
    const { count } = await apply.mutateAsync({ cancel: true });

    showSuccess(t("locales.retranslateCanceled", { count }, count));
  });
}
</script>

<template>
  <Dialog :open :title :persistent="isPending" @close="cancel">
    <form class="space-y-4" @submit.prevent="retranslate">
      <p class="text-sm text-neutral-700 dark:text-neutral-200">
        {{ t("locales.retranslateIntro") }}
      </p>
      <p
        v-if="forEntries"
        class="text-sm text-neutral-500 dark:text-neutral-400"
        data-testid="retranslate-languages"
      >
        {{ t("entries.retranslateLanguages", { languages }) }}
      </p>

      <Select
        v-model="texts"
        teleport-to="body"
        :options="textOptions"
        :disabled="isPending"
        >{{ t("locales.retranslateTexts") }}</Select
      >

      <div v-if="!forEntries" class="space-y-1">
        <Select
          v-model="scopeIds"
          teleport-to="body"
          multiple
          :options="scopeOptions"
          :disabled="isPending || scopesLoading"
          :invalid="!!scopeError"
          :placeholder="t('scopes.all')"
          >{{ t("nav.scopes") }}</Select
        >
        <p v-if="scopeError" role="alert" class="text-xs text-red-600">
          {{ t("scopes.loadFailed") }}
        </p>
      </div>

      <div
        v-if="counts"
        class="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600 dark:text-neutral-300"
        aria-live="polite"
      >
        <div>
          <p data-testid="retranslate-count">
            {{
              t(
                "locales.retranslateCount",
                { count: counts.count },
                counts.count,
              )
            }}
          </p>
          <p v-if="counts.pending" data-testid="retranslate-pending">
            {{
              t(
                "locales.retranslatePending",
                { count: counts.pending },
                counts.pending,
              )
            }}
          </p>
        </div>
        <Button
          v-if="counts.pending"
          type="button"
          ghost
          :disabled="isPending"
          @click="takeBack"
        >
          {{ t("locales.retranslateCancel") }}
        </Button>
      </div>

      <Alert v-if="error" variant="danger" dense persistent>
        {{ error }}
      </Alert>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="isPending" @click="cancel">
          {{ t("common.cancel") }}
        </Button>
        <Button
          primary
          :disabled="isPending || !counts?.count"
          @click="retranslate"
        >
          {{ t("locales.retranslate") }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
