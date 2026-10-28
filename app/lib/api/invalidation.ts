import { useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

/**
 * Returns a function that refreshes everything an import can change: entries,
 * translations and counts. Call it during setup, as query keys need the setup
 * context; the returned function works anywhere, e.g. after an await.
 */
export function useTranslationDataInvalidation() {
  const queryClient = useQueryClient();
  const queryKeys = [
    api.entries.feed,
    api.entries.get,
    api.locales.list,
    api.stats.get,
    api.activity.recent,
  ].map((endpoint) => endpoint.getQueryKey());

  return () =>
    Promise.all(
      queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}
