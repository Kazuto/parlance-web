import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export const useLocalizationStore = defineStore("localizationStore", () => {
  const queryClient = useQueryClient();
  const queryKey = api.localizations.list.getQueryKey();

  const create = useMutation({
    ...api.localizations.create.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const update = useMutation({
    ...api.localizations.update.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const destroy = useMutation({
    ...api.localizations.delete.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const restore = useMutation({
    ...api.localizations.restore.use(),
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
