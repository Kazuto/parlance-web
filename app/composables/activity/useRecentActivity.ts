import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export function useRecentActivity(limit = 10) {
  const onlyMine = ref(false);
  const params = computed(() => ({ limit, onlyMine: onlyMine.value }));

  const query = useQuery({
    ...api.activity.recent.use(params),
    refetchInterval: 60_000,
  });

  const items = computed(() => query.data.value?.items ?? []);

  return { ...query, items, onlyMine };
}
