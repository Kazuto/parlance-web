import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export const useSsoProviderStore = defineStore("ssoProviderStore", () => {
  const queryClient = useQueryClient();
  // The sign-in page lists the enabled providers.
  const queryKeys = [
    api.ssoProviders.list.getQueryKey(),
    api.auth.signInProviders.getQueryKey(),
  ];
  const invalidate = () =>
    Promise.all(
      queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );

  const create = useMutation({
    ...api.ssoProviders.create.use(),
    onSuccess: invalidate,
  });
  const update = useMutation({
    ...api.ssoProviders.update.use(),
    onSuccess: invalidate,
  });
  const destroy = useMutation({
    ...api.ssoProviders.delete.use(),
    onSuccess: invalidate,
  });
  const test = useMutation(api.ssoProviders.test.use());

  return { create, update, destroy, test };
});
