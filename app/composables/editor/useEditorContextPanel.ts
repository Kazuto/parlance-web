import { useMediaQuery } from "@vueuse/core";
import type { Ref } from "vue";

/**
 * The side panel of an editor page, which shows context for one of the selected
 * languages. It starts closed on narrow screens.
 */
export function useEditorContextPanel(options: {
  selectedLocaleIds: Ref<string[]>;
  /** The selected languages in row order, the source language first. */
  orderedSelectedLocaleIds: Ref<string[]>;
  defaultLocaleId: () => string | null | undefined;
  localeLabel: (localeId: string) => string;
}) {
  const contextOpen = ref(true);
  const contextTab = ref("terminology");
  const narrowWorkspace = useMediaQuery("(max-width: 1100px)");

  watch(
    narrowWorkspace,
    (narrow) => {
      if (narrow) contextOpen.value = false;
    },
    { immediate: true },
  );

  const activeLocaleId = ref<string>();
  const activeLocaleName = computed(() =>
    activeLocaleId.value ? options.localeLabel(activeLocaleId.value) : "",
  );

  function openContext(localeId: string, tab?: string) {
    activeLocaleId.value = localeId;
    if (tab) contextTab.value = tab;
    contextOpen.value = true;
  }

  // The row button toggles: on the language already shown it closes the panel.
  function toggleContext(localeId: string) {
    if (contextOpen.value && activeLocaleId.value === localeId) {
      contextOpen.value = false;

      return;
    }

    openContext(localeId);
  }

  // Typing in another language moves an open panel along, without opening it.
  function onRowFocus(localeId: string) {
    if (contextOpen.value) activeLocaleId.value = localeId;
  }

  // The panel starts on the source language, like the rows are ordered.
  watch(
    [options.selectedLocaleIds, options.defaultLocaleId],
    () => {
      if (
        !activeLocaleId.value ||
        !options.selectedLocaleIds.value.includes(activeLocaleId.value)
      ) {
        activeLocaleId.value = options.orderedSelectedLocaleIds.value[0];
      }
    },
    { deep: true },
  );

  return {
    contextOpen,
    contextTab,
    activeLocaleId,
    activeLocaleName,
    openContext,
    toggleContext,
    onRowFocus,
  };
}
