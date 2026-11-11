import { api } from "~/lib/api";

export type TagOption = {
  label: string;
  value: string;
  scopeId: string;
  color?: string;
};

export function useScopeOptions() {
  const { t } = useI18n();
  const { items, data, error, isFetching } = useAllPages(
    api.scopes.list,
    (response) => response.scopes,
  );

  const options = computed(() =>
    items.value
      .filter((scope) => !!scope.id)
      .map((scope) => ({
        label: scope.name ?? scope.slug ?? scope.id!,
        value: scope.id!,
        color: scope.color ?? undefined,
        // In name order, as the server lists them.
        tags: (scope.tags ?? []).flatMap((tag) =>
          tag.id ? [{ id: tag.id, name: tag.name ?? tag.id }] : [],
        ),
      }))
      .toSorted((a, b) => a.label.localeCompare(b.label)),
  );

  /**
   * The tags of the scopes, to pick from once scopes are chosen. With several
   * scopes each tag names its scope, e.g. "Mobile › Onboarding".
   */
  function tagOptionsFor(scopeIds: readonly string[]): TagOption[] {
    const scopes = options.value.filter((scope) =>
      scopeIds.includes(scope.value),
    );

    return scopes.flatMap((scope) =>
      scope.tags.map((tag) => ({
        label:
          scopes.length > 1
            ? t("tags.option", { scope: scope.label, tag: tag.name })
            : tag.name,
        value: tag.id,
        scopeId: scope.value,
        color: scope.color,
      })),
    );
  }

  /**
   * The tags that belong to the scopes. Until the scopes have loaded every tag
   * is kept, so tags from a link aren't dropped before they can be checked.
   */
  function tagsWithin(tagIds: readonly string[], scopeIds: readonly string[]) {
    if (!data.value) return [...tagIds];

    const allowed = new Set(tagOptionsFor(scopeIds).map((tag) => tag.value));

    return tagIds.filter((id) => allowed.has(id));
  }

  return { options, tagOptionsFor, tagsWithin, error, isFetching };
}

/**
 * Tags picked within picked scopes: only the scopes' tags are offered, and a
 * tag goes when its scope is deselected.
 */
export function useScopedTags(
  scopeIds: Ref<string[]>,
  tagIds: Ref<string[]>,
  scopeOptions: Pick<
    ReturnType<typeof useScopeOptions>,
    "options" | "tagOptionsFor" | "tagsWithin"
  > = useScopeOptions(),
) {
  const tagOptions = computed(() => scopeOptions.tagOptionsFor(scopeIds.value));

  watch(
    [scopeIds, tagIds, scopeOptions.options],
    () => {
      const kept = scopeOptions.tagsWithin(tagIds.value, scopeIds.value);

      if (kept.length !== tagIds.value.length) tagIds.value = kept;
    },
    { deep: true, immediate: true },
  );

  return { tagOptions };
}
