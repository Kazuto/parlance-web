import type { LocationQuery } from "vue-router";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

type EntryFilterRefs = {
  locales: Ref<Locale[] | null | undefined>;
  localeIds: Ref<string[]>;
  scopeIds: Ref<string[]>;
  status: Ref<string>;
  search: Ref<string>;
};

const STATUSES = ["missing", "complete", "review"];

function first(value: LocationQuery[string] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/**
 * Mirrors the entry filters into the URL (`?locales=en,de&scopes=…&status=…&q=…`)
 * so a filtered view can be bookmarked or shared. Locales are stored by code,
 * which stays readable and survives locale re-creation; everything else by value.
 *
 * Without filters in the URL, the filters last used in this browser come back
 * (see useStoredFilters); changes made on the page are remembered for next time.
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
  const stored = useStoredFilters();
  // A link with its own filters (e.g. from recent activity) shows exactly that view;
  // stored scopes or status could otherwise hide the entry it points to.
  const fromLink = ["locales", "scopes", "status", "q"].some(
    (key) => !!first(initialQuery[key]),
  );

  scopeIds.value = fromLink
    ? first(initialQuery.scopes).split(",").filter(Boolean)
    : (stored.entries.value.scopes ?? []).filter(
        (id) => typeof id === "string" && !!id,
      );

  const initialStatus = fromLink
    ? first(initialQuery.status)
    : String(stored.entries.value.status ?? "");

  status.value = STATUSES.includes(initialStatus) ? initialStatus : "";
  search.value = first(initialQuery.q);

  const localeCodes = computed(() =>
    localeIds.value
      .map((id) => locales.value?.find((locale) => locale.id === id)?.code)
      .filter((code): code is string => !!code),
  );

  // Locales resolve once the locale list arrives; the URL is left alone until then
  // so an unresolved `locales` param is not overwritten by the empty selection.
  const localesReady = ref(false);
  const scope = getCurrentScope();

  watch(
    locales,
    (list) => {
      if (localesReady.value || !list?.length) return;

      const codes = fromLink
        ? first(initialQuery.locales).split(",").filter(Boolean)
        : stored.languages.value;
      const initial = localeIdsFromCodes(list, codes);
      const fallback = (list.find((locale) => locale.isDefault) ?? list[0])?.id;

      localeIds.value = initial.length ? initial : fallback ? [fallback] : [];
      localesReady.value = true;
      // Remember only changes from here on, so opening a link doesn't replace
      // the stored filters. Watch the selection itself, not the codes derived
      // from the locale list: that list reloads (and is briefly empty while it
      // does), which is no change by the user. The page's scope stops the
      // watcher on unmount.
      scope?.run(() =>
        watch(
          [localeIds, scopeIds, status],
          ([, scopes, nextStatus]) => {
            if (locales.value?.length) {
              stored.languages.value = [...localeCodes.value];
            }

            stored.entries.value = { scopes: [...scopes], status: nextStatus };
          },
          { deep: true },
        ),
      );
    },
    { immediate: true },
  );

  watch(
    [localesReady, localeCodes, scopeIds, status, search],
    () => {
      // While the locale list reloads its codes are unknown; keeping the URL as
      // it is avoids dropping the selected locales from it.
      if (!localesReady.value || !locales.value?.length) return;

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

/**
 * A link to the entries page showing these filters, in the URL format
 * useEntryFilterQuery reads, e.g. `/entries?locales=en,de&status=missing`.
 */
export function entriesLink(filters: {
  locales?: string[];
  scopes?: string[];
  status?: "missing" | "complete" | "review";
  q?: string;
}) {
  const list = (values: string[]) =>
    values.map((value) => encodeURIComponent(value)).join(",");
  const params = [
    filters.locales?.length && `locales=${list(filters.locales)}`,
    filters.scopes?.length && `scopes=${list(filters.scopes)}`,
    filters.status && `status=${filters.status}`,
    filters.q && `q=${encodeURIComponent(filters.q)}`,
  ].filter(Boolean);

  return params.length ? `/entries?${params.join("&")}` : "/entries";
}
