import { useQueryClient } from "@tanstack/vue-query";
import type { Ref } from "vue";
import { api } from "~/lib/api";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";

const MAX_BULK_TRANSLATE = 50;
// Copying asks no translation service, it only loads each entry.
const MAX_BULK_COPY = 200;

type Mode = "translate" | "copy";

/** The drafts the translations go into, see useTranslationDrafts. */
type Drafts = {
  forms: Ref<Record<string, Record<string, string>>>;
  saved: Ref<Record<string, Record<string, string>>>;
  register: (entry: Entry) => void;
  isDirty: (entryId: string, localeId: string) => boolean;
  setForm: (entryId: string, localeId: string, value: string) => void;
};

/**
 * AI translation of the ticked entries, one after the other: like for one entry,
 * the empty selected languages get drafts to review. Copying fills them with the
 * default text instead. Each entry is loaded first, so its drafts save like any
 * other.
 */
export function useBulkTranslate(options: {
  entryIds: Ref<string[]>;
  selectedLocaleIds: Ref<string[]>;
  sourceLocaleId: () => string | null | undefined;
  drafts: Drafts;
  suggest: (
    entryId: string,
    localeIds: string[],
  ) => Promise<{ localeId?: string | null; translation?: string | null }[]>;
}) {
  const { t } = useI18n();
  const { showSuccess, showError } = useErrorHelper();
  const queryClient = useQueryClient();
  const drafts = options.drafts;
  const state = ref<{
    mode: Mode;
    done: number;
    total: number;
    stop: boolean;
  }>();

  // Built during setup, which the API client needs; the query key carries the id.
  const entryQuery = api.entries.get.use({ id: "" });

  function loadEntry(id: string) {
    const [operation, middlewares] = entryQuery.queryKey;

    return queryClient.fetchQuery({
      queryKey: [operation, middlewares, { id }] as const,
      queryFn: entryQuery.queryFn,
      // Translating needs the saved text as it is now.
      staleTime: 0,
    });
  }

  const targetLocaleIds = computed(() =>
    options.selectedLocaleIds.value.filter(
      (id) => id !== options.sourceLocaleId(),
    ),
  );

  // Why the ticked entries can't be translated or copied right now, if they can't.
  function blockerFor(mode: Mode) {
    const copy = mode === "copy";
    const max = copy ? MAX_BULK_COPY : MAX_BULK_TRANSLATE;

    if (options.entryIds.value.length > max)
      return t(copy ? "entries.bulkCopyLimit" : "entries.bulkTranslateLimit", {
        max,
      });
    if (!targetLocaleIds.value.length)
      return t(
        copy
          ? "entries.bulkCopyNoLanguages"
          : "entries.bulkTranslateNoLanguages",
      );

    return undefined;
  }

  const blocker = computed(() => blockerFor("translate"));
  const copyBlocker = computed(() => blockerFor("copy"));

  async function run(mode: Mode = "translate") {
    const sourceId = options.sourceLocaleId();

    if (!sourceId || state.value || blockerFor(mode)) return;

    const entryIds = [...options.entryIds.value];
    const targets = [...targetLocaleIds.value];
    const result = { languages: 0, entries: 0, skipped: 0, failed: 0 };

    state.value = { mode, done: 0, total: entryIds.length, stop: false };

    const progress = state.value;

    try {
      for (const entryId of entryIds) {
        if (progress.stop) break;

        try {
          const { entry } = await loadEntry(entryId);

          if (entry) drafts.register(entry);

          const empty = targets.filter(
            (id) => !(drafts.forms.value[entryId]?.[id] ?? "").trim(),
          );
          // The server translates the saved default text, and copies take it too.
          const source = drafts.saved.value[entryId]?.[sourceId] ?? "";

          if (
            !empty.length ||
            !source.trim() ||
            drafts.isDirty(entryId, sourceId)
          ) {
            result.skipped++;

            continue;
          }

          let filled = 0;
          const texts =
            mode === "copy"
              ? empty.map((localeId) => ({ localeId, translation: source }))
              : await options.suggest(entryId, empty);

          for (const { localeId, translation } of texts) {
            if (!localeId) continue;

            if (!translation) result.failed++;
            // Text typed while waiting stays.
            else if (!(drafts.forms.value[entryId]?.[localeId] ?? "").trim()) {
              drafts.setForm(entryId, localeId, translation);
              filled++;
            }
          }

          result.languages += filled;
          if (filled) result.entries++;
        } catch {
          result.failed++;
        } finally {
          progress.done++;
        }
      }
    } finally {
      state.value = undefined;

      const message = [
        progress.stop ? t("entries.bulkTranslateStopped") : "",
        t(
          mode === "copy"
            ? "entries.bulkCopyDone"
            : "entries.bulkTranslateDone",
          result,
        ),
      ]
        .filter(Boolean)
        .join(" ");

      if (result.failed && !result.languages) showError(message);
      else showSuccess(message);
    }
  }

  function stop() {
    if (state.value) state.value.stop = true;
  }

  return { progress: state, blocker, copyBlocker, run, stop };
}
