import type { QueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

/** Refreshes everything an import can change: entries, translations and counts. */
export function invalidateTranslationData(queryClient: QueryClient) {
  return Promise.all(
    [
      api.entries.feed,
      api.entries.get,
      api.locales.list,
      api.stats.get,
      api.activity.recent,
    ].map((endpoint) =>
      queryClient.invalidateQueries({ queryKey: endpoint.getQueryKey() }),
    ),
  );
}
