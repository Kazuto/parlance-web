import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export const useEntryStore = defineStore("entryStore", () => {
  const queryClient = useQueryClient();
  const feedQueryKey = api.entries.feed.getQueryKey();
  const detailQueryKey = api.entries.get.getQueryKey();
  // Deleting and restoring also change the list of deleted entries.
  const listQueryKey = api.entries.list.getQueryKey();
  // The scopes page counts each tag's entries, and the releases page each release's.
  const scopesQueryKey = api.scopes.list.getQueryKey();
  const releasesQueryKey = api.releases.list.getQueryKey();

  const create = useMutation({
    ...api.entries.create.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
      queryClient.invalidateQueries({ queryKey: scopesQueryKey });
      queryClient.invalidateQueries({ queryKey: releasesQueryKey });
    },
  });

  const update = useMutation({
    ...api.entries.update.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
      queryClient.invalidateQueries({ queryKey: scopesQueryKey });
      queryClient.invalidateQueries({ queryKey: releasesQueryKey });
    },
  });

  const updateScopes = useMutation({
    ...api.entries.updateScopes.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
      queryClient.invalidateQueries({ queryKey: detailQueryKey });
    },
  });

  // Adding a tag can add its scope to the entries too.
  const updateTags = useMutation({
    ...api.entries.updateTags.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
      queryClient.invalidateQueries({ queryKey: detailQueryKey });
      queryClient.invalidateQueries({ queryKey: scopesQueryKey });
    },
  });

  const updateReleases = useMutation({
    ...api.entries.updateReleases.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
      queryClient.invalidateQueries({ queryKey: detailQueryKey });
      queryClient.invalidateQueries({ queryKey: releasesQueryKey });
    },
  });

  const destroy = useMutation({
    ...api.entries.delete.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
      queryClient.invalidateQueries({ queryKey: listQueryKey });
    },
  });

  const destroyMany = useMutation({
    ...api.entries.deleteMany.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
      queryClient.invalidateQueries({ queryKey: listQueryKey });
    },
  });

  const restore = useMutation({
    ...api.entries.restore.use(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
      queryClient.invalidateQueries({ queryKey: listQueryKey });
    },
  });

  return {
    create,
    update,
    updateScopes,
    updateTags,
    updateReleases,
    destroy,
    destroyMany,
    restore,
  };
});
