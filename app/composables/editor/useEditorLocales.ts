import type {
  Formality,
  Locale,
} from "~/lib/api/schemas/parlance/v1/LocaleSchema";

export type LocaleOption = {
  label: string;
  value: string;
  code: string;
  formality?: Formality | null;
};

const MAX_LISTED_LANGUAGES = 3;

/** Locale lookups shared by the translation editors (entries and glossary). */
export function useEditorLocales(
  locales: MaybeRefOrGetter<Locale[] | null | undefined>,
  selectedLocaleIds: Ref<string[]>,
) {
  const { t } = useI18n();
  const localeName = useLocaleName();

  const defaultLocale = computed(() =>
    toValue(locales)?.find((locale) => locale.isDefault),
  );

  // The default locale, or the first one if none is marked default.
  const defaultLocaleIds = computed(() => {
    const list = toValue(locales) ?? [];
    const id = (list.find((locale) => locale.isDefault) ?? list[0])?.id;

    return id ? [id] : [];
  });

  const localeOptions = computed<LocaleOption[]>(
    () =>
      toValue(locales)
        ?.filter((locale) => !!locale.id)
        .toSorted((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault))
        .map((locale) => ({
          label: localeName(locale),
          value: locale.id ?? "",
          code: locale.code ?? "",
          formality: locale.formality,
        })) ?? [],
  );

  function localeOption(id: string | null | undefined) {
    return localeOptions.value.find((option) => option.value === id);
  }

  // The default locale first, as the source the others are translated from.
  const orderedSelectedLocaleIds = computed(() => {
    const id = defaultLocale.value?.id;

    return id && selectedLocaleIds.value.includes(id)
      ? [id, ...selectedLocaleIds.value.filter((localeId) => localeId !== id)]
      : selectedLocaleIds.value;
  });

  const selectedLanguageLabels = computed(() =>
    orderedSelectedLocaleIds.value
      .map((id) => localeOption(id)?.label)
      .filter((label): label is string => !!label),
  );

  const languageSummary = computed(() => {
    const labels = selectedLanguageLabels.value;

    if (!labels.length) return t("entries.selectLocales");

    if (labels.length > 1 && labels.length === localeOptions.value.length)
      return t("common.allLanguages");

    const listed = labels.slice(0, MAX_LISTED_LANGUAGES).join(", ");
    const hidden = labels.length - MAX_LISTED_LANGUAGES;

    return `${t("common.languages")}: ${listed}${hidden > 0 ? ` +${hidden}` : ""}`;
  });

  const languagesFiltered = computed(
    () =>
      selectedLocaleIds.value.length !== defaultLocaleIds.value.length ||
      selectedLocaleIds.value.some(
        (id) => !defaultLocaleIds.value.includes(id),
      ),
  );

  return {
    defaultLocale,
    defaultLocaleIds,
    localeOptions,
    localeOption,
    orderedSelectedLocaleIds,
    selectedLanguageLabels,
    languageSummary,
    languagesFiltered,
  };
}
