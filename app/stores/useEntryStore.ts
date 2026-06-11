import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export const useEntryStore = defineStore("entryStore", () => {
  const queryClient = useQueryClient();
  const queryKey = api.entries.list.getQueryKey();

  const create = useMutation({
    ...api.entries.create.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const update = useMutation({
    ...api.entries.update.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const destroy = useMutation({
    ...api.entries.delete.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const restore = useMutation({
    ...api.entries.restore.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    create,
    update,
    destroy,
    restore,
  };
});
