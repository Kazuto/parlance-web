import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import type { Release } from "~/lib/api/schemas/parlance/v1/ReleaseSchema";

/** A release's date in the interface language, e.g. "1 Apr 2030, 09:00", or "Not scheduled". */
export function useReleaseDate() {
  const { t, locale } = useI18n();
  const format = computed(
    () =>
      new Intl.DateTimeFormat(locale.value, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
  );

  return (release: Pick<Release, "releaseAt">) =>
    release.releaseAt
      ? format.value.format(new Date(release.releaseAt))
      : t("releases.notScheduled");
}

/**
 * The releases to pick from, for those who may read them: pending ones first,
 * by date, then those that went out, as the server lists them. Entries only
 * join pending releases; the filter offers all.
 */
export function useReleaseOptions() {
  const { can } = usePermission();
  const describe = useReleaseDate();
  const { items, error, isFetching } = useAllPages(
    api.releases.list,
    (response) => response.releases,
    () => can.value("read_release"),
  );

  const options = computed(() =>
    items.value
      .filter((release) => !!release.id)
      .map((release) => ({
        label: release.name ?? release.id!,
        value: release.id!,
        pending: !release.releasedAt,
        /** When it goes out, or "Not scheduled" */
        date: describe(release),
        hasDate: !!release.releaseAt,
      })),
  );
  const pendingOptions = computed(() =>
    options.value.filter((release) => release.pending),
  );

  return { options, pendingOptions, error, isFetching };
}

/**
 * How many of the entries exports carry with approved texts now: a release would
 * take those texts, which may be live, out of exports. Loads only while enabled.
 */
export function useLiveEntryCount(
  entryIds: MaybeRefOrGetter<readonly string[]>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const options = api.entries.countLive.use(
    computed(() => ({ entryIds: [...toValue(entryIds)] })),
  );
  const { data } = useQuery({
    ...options,
    enabled: computed(
      () =>
        toValue(options.enabled) &&
        toValue(enabled) &&
        toValue(entryIds).length > 0,
    ),
  });

  return computed(() => (toValue(enabled) ? (data.value?.count ?? 0) : 0));
}
