import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export const useLocaleStore = defineStore("localeStore", () => {
  const queryClient = useQueryClient();
  const queryKey = api.locales.list.getQueryKey();

  const create = useMutation({
    ...api.locales.create.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const update = useMutation({
    ...api.locales.update.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const destroy = useMutation({
    ...api.locales.delete.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const restore = useMutation({
    ...api.locales.restore.use(),
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
