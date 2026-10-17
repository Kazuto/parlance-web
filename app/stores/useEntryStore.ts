import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export const useEntryStore = defineStore("entryStore", () => {
  const queryClient = useQueryClient();
  const queryKey = api.entries.list.getQueryKey();
  const feedQueryKey = api.entries.feed.getQueryKey();

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
    destroy,
    restore,
  };
});
