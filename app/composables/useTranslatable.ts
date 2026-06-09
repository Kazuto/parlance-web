import type { Locale } from "~/lib/api/schemas/LocaleSchema";

export function useTranslatable<T>() {
  const store = useLocaleStore();

  const { data } = storeToRefs(store);

  const localeCount = computed(() => data.value?.pagination?.total ?? 0);

  function getTranslatableCount(item: T, key: keyof T): number {
    if (typeof item[key] === "string") return 1;

    if (isObject(item[key])) {
      return Object.values(item[key]).filter((value) => value).length;
    }

    return 0;
  }

  function getMissingKeys(item: T, key: keyof T): string[] {
    const localeKeys = data?.value?.locales.flatMap(
      (locale: Locale) => locale.code ?? [],
    );

    if (!localeKeys?.length) return [];

    if (typeof item[key] === "string") return [];

    if (isObject(item[key])) {
      const existingKeys = Object.keys(item[key]);

      return localeKeys.filter((code) => !existingKeys.includes(code));
    }

    return [];
  }

  function mapTranslatable(items: T[], key: keyof T) {
    return items.map((item) => ({
      ...item,
      translations: getTranslatableCount(item, key),
      missingKeys: getMissingKeys(item, key),
    }));
  }

  return {
    localeCount,
    getTranslatableCount,
    getMissingKeys,
    mapTranslatable,
  };
}

const isObject = (item: unknown): item is Record<string, unknown> => {
  if (item === null || typeof item !== "object") {
    return false;
  }

  const proto = Object.getPrototypeOf(item);

  return proto === Object.prototype;
};
