import type { SplitViewItem } from "@thkzt/eunoia";
import type { Ref } from "vue";

/**
 * Moves through the entry list from the keyboard. Moving past the loaded entries
 * loads more, and the language field that had the focus gets it back on the next
 * entry once that shows.
 */
export function useEntryNavigation(options: {
  items: Ref<SplitViewItem[]>;
  selected: Ref<SplitViewItem | undefined>;
  select: (item: SplitViewItem) => void;
  hasMore: () => boolean;
  loadMore: () => Promise<unknown>;
  /** Whether the open entry's fields show, rather than a loading state. */
  ready: () => boolean;
  /** The id of an entry's field for a language. */
  fieldId: (entryId: string, localeId: string) => string;
  focusedLocaleId: () => string | undefined;
}) {
  const pendingFocus = ref<{ entryId: string; localeId: string }>();

  async function move(step: 1 | -1) {
    const localeId = options.focusedLocaleId();
    const index = options.items.value.findIndex(
      (item) => item.key === options.selected.value?.key,
    );
    let target =
      index + step >= 0 ? options.items.value[index + step] : undefined;

    if (!target && step === 1 && options.hasMore()) {
      await options.loadMore();
      target = options.items.value[index + 1];
    }

    if (!target) return;

    options.select(target);
    if (localeId)
      pendingFocus.value = { entryId: String(target.key), localeId };
  }

  watch(
    [pendingFocus, options.ready, () => options.selected.value?.key],
    () => {
      const pending = pendingFocus.value;

      if (!pending) return;

      // Another entry was picked meanwhile; the focus stays where the user put it.
      if (String(options.selected.value?.key) !== pending.entryId) {
        pendingFocus.value = undefined;

        return;
      }

      const field = document.getElementById(
        options.fieldId(pending.entryId, pending.localeId),
      );

      if (!field) return;

      field.focus();
      pendingFocus.value = undefined;
    },
    { flush: "post" },
  );

  return {
    previous: () => move(-1),
    next: () => move(1),
  };
}
