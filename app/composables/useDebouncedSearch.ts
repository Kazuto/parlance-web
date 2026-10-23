import { watchDebounced } from "@vueuse/core";
import type { Ref } from "vue";

/**
 * Passes a search box's text to `apply` once typing pauses, as undefined when
 * empty. Returns the box's keydown handler, which clears it on Escape.
 */
export function useDebouncedSearch(
  search: Ref<string>,
  apply: (value: string | undefined) => void,
  delay = 300,
) {
  watchDebounced(search, (value) => apply(value || undefined), {
    debounce: delay,
  });

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape" || !search.value) return;
    event.preventDefault();
    search.value = "";
  }

  return { onKeydown };
}
