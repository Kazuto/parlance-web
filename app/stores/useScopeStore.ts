import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export const useScopeStore = defineStore("scopeStore", () => {
  const queryClient = useQueryClient();
  // Entries show scope names and colors, so refresh them along with the scope list.
  const queryKeys = [
    api.scopes.list.getQueryKey(),
    api.entries.feed.getQueryKey(),
    api.entries.get.getQueryKey(),
  ];
  const invalidate = () =>
    Promise.all(
      queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );

  const create = useMutation({
    ...api.scopes.create.use(),
    onSuccess: invalidate,
  });
  const update = useMutation({
    ...api.scopes.update.use(),
    onSuccess: invalidate,
  });
  const destroy = useMutation({
    ...api.scopes.delete.use(),
    onSuccess: invalidate,
  });
  const restore = useMutation({
    ...api.scopes.restore.use(),
    onSuccess: invalidate,
  });

  return {
    create,
    update,
    destroy,
    restore,
  };
});
