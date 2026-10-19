import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export const useEntryStore = defineStore("entryStore", () => {
  const queryClient = useQueryClient();
  const queryKey = api.entries.list.getQueryKey();
  const feedQueryKey = api.entries.feed.getQueryKey();
  const detailQueryKey = api.entries.get.getQueryKey();

  const create = useMutation({
    ...api.entries.create.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
    },
  });

  const update = useMutation({
    ...api.entries.update.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
    },
  });

  const updateScopes = useMutation({
    ...api.entries.updateScopes.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
      queryClient.invalidateQueries({ queryKey: detailQueryKey });
    },
  });

  const destroy = useMutation({
    ...api.entries.delete.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
    },
  });

  const restore = useMutation({
    ...api.entries.restore.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
    },
  });

  return {
    create,
    update,
    updateScopes,
    destroy,
    restore,
  };
});
