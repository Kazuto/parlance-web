import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

// The signed-in user's own account, which needs no permission to change.
export const useAccountStore = defineStore("accountStore", () => {
  const queryClient = useQueryClient();
  const authStore = useAuthStore();
  // Query keys need the setup context, so they are taken here.
  const currentUserKey = api.auth.getCurrentUser.getQueryKey();
  const apiTokensKey = api.account.apiTokens.getQueryKey();
  // Lists show the user's name and avatar too.
  const queryKeys = [api.users.list.getQueryKey(), currentUserKey];

  const update = useMutation({
    ...api.account.update.use(),
    onSuccess: (data) => {
      if (data.user) authStore.setUser(data.user);

      return Promise.all(
        queryKeys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
  // Accounts that had no password have one now, which the current user tells.
  const changePassword = useMutation({
    ...api.account.changePassword.use(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: currentUserKey }),
  });

  const invalidateApiTokens = () =>
    queryClient.invalidateQueries({ queryKey: apiTokensKey });
  const createApiToken = useMutation({
    ...api.account.createApiToken.use(),
    onSuccess: invalidateApiTokens,
  });
  const deleteApiToken = useMutation({
    ...api.account.deleteApiToken.use(),
    onSuccess: invalidateApiTokens,
  });

  return { update, changePassword, createApiToken, deleteApiToken };
});
