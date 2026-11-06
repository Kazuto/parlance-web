import { api } from "~/lib/api";

export function useScopeOptions() {
  const { items, error, isFetching } = useAllPages(
    api.scopes.list,
    (response) => response.scopes,
  );

  const options = computed(() =>
    items.value
      .filter((scope) => !!scope.id)
      .map((scope) => ({
        label: scope.name ?? scope.slug ?? scope.id!,
        value: scope.id!,
        color: scope.color ?? undefined,
      }))
      .toSorted((a, b) => a.label.localeCompare(b.label)),
  );

  return { options, error, isFetching };
}
