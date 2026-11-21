import type { DraftChange } from "~/composables/editor/useTranslationDrafts";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";
import { isSmallChange } from "~/lib/textChange";

/** A default text about to be saved with only a small fix, e.g. of a typo. */
export type SmallSourceChange = {
  entryId: string;
  key: string;
  before: string;
  after: string;
};

export type OutdateAnswer = "keep" | "outdate" | "cancel";

/**
 * Asks before small fixes of default texts, such as typos or punctuation, mark
 * their entries' translations outdated. Larger changes mark them without asking.
 */
export function useOutdateCheck(options: {
  defaultLocaleId: () => string | undefined;
  /** The entry as last loaded, with its saved translations. */
  entry: (entryId: string) => Entry | undefined;
}) {
  /** The fixes the user is asked about, while the question is open. */
  const asking = ref<SmallSourceChange[]>();
  let reply: ((answer: OutdateAnswer) => void) | undefined;

  /** The small fixes among the changes whose entry has translations to outdate. */
  function smallFixes(changes: DraftChange[]): SmallSourceChange[] {
    const defaultLocaleId = options.defaultLocaleId();

    if (!defaultLocaleId) return [];

    return changes.flatMap(({ itemId, localeId, translation }) => {
      if (localeId !== defaultLocaleId) return [];

      const entry = options.entry(itemId);
      const rows = entry?.localizations ?? [];
      const before =
        rows.find((row) => row.localeId === defaultLocaleId)?.translation ?? "";

      if (!isSmallChange(before, translation)) return [];

      // Translations saved along with it are written for the new text.
      const saving = new Set(
        changes
          .filter((change) => change.itemId === itemId)
          .map((change) => change.localeId),
      );
      const outdates = rows.some(
        (row) =>
          row.localeId !== defaultLocaleId &&
          !saving.has(row.localeId ?? "") &&
          !!row.translation &&
          !row.outdated,
      );

      return outdates
        ? [
            {
              entryId: itemId,
              key: entry?.key ?? itemId,
              before,
              after: translation,
            },
          ]
        : [];
    });
  }

  /**
   * Asks about the small fixes among the changes, if there are any. Resolves to the
   * entries whose translations stay current, or to undefined when the user cancels
   * saving.
   */
  async function check(changes: DraftChange[]) {
    const fixes = smallFixes(changes);

    if (!fixes.length) return new Set<string>();
    // A save started while asking waits for the question to be answered.
    if (asking.value) return undefined;

    asking.value = fixes;

    const answer = await new Promise<OutdateAnswer>(
      (resolve) => (reply = resolve),
    );

    asking.value = undefined;
    reply = undefined;

    if (answer === "cancel") return undefined;

    return new Set(answer === "keep" ? fixes.map((fix) => fix.entryId) : []);
  }

  function answer(choice: OutdateAnswer) {
    reply?.(choice);
  }

  return { asking, check, answer };
}
