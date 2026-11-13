import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export const useReleaseStore = defineStore("releaseStore", () => {
  const queryClient = useQueryClient();
  // Entries show their pending releases, so refresh them along with the list.
  const queryKeys = [
    api.releases.list.getQueryKey(),
    api.entries.feed.getQueryKey(),
    api.entries.get.getQueryKey(),
  ];
  const invalidate = () =>
    Promise.all(
      queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );

  const create = useMutation({
    ...api.releases.create.use(),
    onSuccess: invalidate,
  });
  const update = useMutation({
    ...api.releases.update.use(),
    onSuccess: invalidate,
  });
  const destroy = useMutation({
    ...api.releases.delete.use(),
    onSuccess: invalidate,
  });
  const publish = useMutation({
    ...api.releases.publish.use(),
    onSuccess: invalidate,
  });

  return { create, update, destroy, publish };
});
