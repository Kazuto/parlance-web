import type { Locale } from "~/lib/api/schemas/LocaleSchema";
import { useLocaleList } from "./locale/useLocaleList";

export function useTranslatable<T>() {
  const { data, filter, pagination } = useLocaleList();

  filter.value.includeDeleted = false;
  pagination.value.perPage = 1000;

  const activeCodes = computed(
    () =>
      data.value?.locales
        .filter((locale: Locale) => !locale.deletedAt)
        .map((locale: Locale) => locale.code) ?? [],
  );

  const localeCount = computed(() => activeCodes.value.length);

  function getTranslatableCount(item: T, key: keyof T): number {
    if (typeof item[key] === "string") return 1;

    if (isObject(item[key])) {
      const obj = item[key] as Record<string, unknown>;

      return activeCodes.value.filter((code) => obj[code]).length;
    }

    return 0;
  }

  function getMissingKeys(item: T, key: keyof T): string[] {
    if (!activeCodes.value.length) return [];
    if (typeof item[key] === "string") return [];

    if (isObject(item[key])) {
      const existingKeys = Object.keys(item[key]);

      return activeCodes.value.filter((code) => !existingKeys.includes(code));
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
