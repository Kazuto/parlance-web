import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export const useTranslationServerStore = defineStore(
  "translationServerStore",
  () => {
    const queryClient = useQueryClient();
    // The current user says whether machine translation is on, which follows
    // whether any server is enabled.
    const queryKeys = [
      api.translationServers.list.getQueryKey(),
      api.auth.getCurrentUser.getQueryKey(),
    ];
    const invalidate = () =>
      Promise.all(
        queryKeys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );

    const create = useMutation({
      ...api.translationServers.create.use(),
      onSuccess: invalidate,
    });
    const update = useMutation({
      ...api.translationServers.update.use(),
      onSuccess: invalidate,
    });
    const destroy = useMutation({
      ...api.translationServers.delete.use(),
      onSuccess: invalidate,
    });
    const test = useMutation(api.translationServers.test.use());
    const updateSettings = useMutation({
      ...api.translationServers.updateSettings.use(),
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: api.translationServers.settings.getQueryKey(),
        }),
    });

    return { create, update, destroy, test, updateSettings };
  },
);
