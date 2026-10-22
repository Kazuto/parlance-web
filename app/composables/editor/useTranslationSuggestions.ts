import { useMutation, useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import type { TranslationSuggestion } from "~/lib/api/schemas/parlance/v1/LocalizationSchema";

/**
 * Machine translations for the entry editor. The server translates the saved
 * default text and saves nothing; the page puts the results into empty fields as
 * drafts to review. The last result per field is kept, so its warnings can show
 * next to the field.
 */
export function useTranslationSuggestions() {
  const authStore = useAuthStore();
  // The same query the layout loads, so this reads from its cache.
  const { data: currentUser } = useQuery({
    ...api.auth.getCurrentUser.use({}),
    enabled: computed(() => authStore.isLoggedIn),
  });
  const enabled = computed(() => !!currentUser.value?.translationEnabled);

  const { mutateAsync, isPending: pending } = useMutation(
    api.localizations.suggestTranslations.use(),
  );

  const results = ref<Record<string, Record<string, TranslationSuggestion>>>(
    {},
  );

  async function suggest(entryId: string, localeIds: string[]) {
    const response = await mutateAsync({ entryId, targetLocaleIds: localeIds });
    const suggestions = response.suggestions ?? [];
    const forEntry = { ...results.value[entryId] };
    for (const suggestion of suggestions) {
      if (suggestion.localeId) forEntry[suggestion.localeId] = suggestion;
    }
    results.value[entryId] = forEntry;
    return suggestions;
  }

  function resultFor(entryId: string, localeId: string) {
    return results.value[entryId]?.[localeId];
  }

  return { enabled, pending, suggest, resultFor };
}
