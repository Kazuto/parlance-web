import type { LocationQuery } from "vue-router";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

type EntryFilterRefs = {
  locales: Ref<Locale[] | null | undefined>;
  localeIds: Ref<string[]>;
  scopeIds: Ref<string[]>;
  status: Ref<string>;
  search: Ref<string>;
};

const STATUSES = ["missing", "complete"];

function first(value: LocationQuery[string] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/**
 * Mirrors the entry filters into the URL (`?locales=en,de&scopes=…&status=…&q=…`)
 * so a filtered view can be bookmarked or shared. Locales are stored by code,
 * which stays readable and survives locale re-creation; everything else by value.
 */
export function useEntryFilterQuery({
  locales,
  localeIds,
  scopeIds,
  status,
  search,
}: EntryFilterRefs) {
  const route = useRoute();
  const router = useRouter();
  const initialQuery = { ...route.query };

  scopeIds.value = first(initialQuery.scopes).split(",").filter(Boolean);
  const initialStatus = first(initialQuery.status);
  status.value = STATUSES.includes(initialStatus) ? initialStatus : "";
  search.value = first(initialQuery.q);

  // Locales resolve once the locale list arrives; the URL is left alone until then
  // so an unresolved `locales` param is not overwritten by the empty selection.
  const localesReady = ref(false);
  watch(
    locales,
    (list) => {
      if (localesReady.value || !list?.length) return;
      const codes = first(initialQuery.locales).split(",").filter(Boolean);
      const fromQuery = list
        .filter((locale) => locale.code && codes.includes(locale.code))
        .map((locale) => locale.id ?? "")
        .filter(Boolean);
      const fallback = (list.find((locale) => locale.isDefault) ?? list[0])?.id;
      localeIds.value = fromQuery.length
        ? fromQuery
        : fallback
          ? [fallback]
          : [];
      localesReady.value = true;
    },
    { immediate: true },
  );

  const localeCodes = computed(() =>
    localeIds.value
      .map((id) => locales.value?.find((locale) => locale.id === id)?.code)
      .filter((code): code is string => !!code),
  );

  watch(
    [localesReady, localeCodes, scopeIds, status, search],
    () => {
      if (!localesReady.value) return;
      const query: LocationQuery = { ...route.query };
      const next: Record<string, string> = {
        locales: localeCodes.value.join(","),
        scopes: scopeIds.value.join(","),
        status: status.value,
        q: search.value.trim(),
      };
      for (const [key, value] of Object.entries(next)) {
        if (value) query[key] = value;
        else Reflect.deleteProperty(query, key);
      }
      router.replace({ query });
    },
    { deep: true },
  );

  return { localesReady };
}
