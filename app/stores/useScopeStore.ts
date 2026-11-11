import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export const useScopeStore = defineStore("scopeStore", () => {
  const queryClient = useQueryClient();
  // Entries show scope names, colors and tags, so refresh them along with the scope list.
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

  const createTag = useMutation({
    ...api.scopes.createTag.use(),
    onSuccess: invalidate,
  });
  const updateTag = useMutation({
    ...api.scopes.updateTag.use(),
    onSuccess: invalidate,
  });
  const destroyTag = useMutation({
    ...api.scopes.deleteTag.use(),
    onSuccess: invalidate,
  });

  return {
    create,
    update,
    destroy,
    restore,
    createTag,
    updateTag,
    destroyTag,
  };
});
