import type { Locale } from "~/lib/api/schemas/LocaleSchema";

export function useCurrentLocale() {
  const store = useLocaleStore();
  const { data } = storeToRefs(store);

  const locales = computed(() => data.value?.locales ?? []);

  const currentLocale = ref<Locale | null>(locales.value[0] ?? null);

  const setCurrentLocale = (locale: Locale) => {
    currentLocale.value = locale;
  };

  const currentLocaleId = computed(() => {
    return currentLocale.value?.id ?? null;
  });

  function findByLocale(items: { localeId: string }[]) {
    return items.find((item) => {
      return item.localeId === currentLocaleId.value;
    });
  }

  return {
    locales,
    currentLocale,
    setCurrentLocale,
    currentLocaleId,
    findByLocale,
  };
}
