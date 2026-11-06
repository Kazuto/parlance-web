import type { Ref } from "vue";

/** A saved translation of an item, e.g. an entry's localization or a term's definition. */
type Row = {
  id?: string | null;
  localeId?: string | null;
  translation?: string | null;
};

/** One translation to save. */
export type DraftChange = {
  itemId: string;
  localeId: string;
  translation: string;
};

/**
 * The translations typed in an editor page, per item and language, next to what
 * the server has saved. Drafts survive reloads of their item and switching to
 * other items, so several can be saved at once.
 */
export function useTranslationDrafts<
  Item extends { id?: string | null },
  SavedRow extends Row,
>(options: {
  /** Names the drafts for the warning before leaving the page. */
  name: string;
  selectedId: Ref<string | undefined>;
  rows: (item: Item) => SavedRow[] | null | undefined;
  setRows: (item: Item, rows: SavedRow[]) => void;
  /** Saves one translation: updates `existing` or creates the row. */
  upsert: (
    change: DraftChange,
    existing: SavedRow | undefined,
  ) => Promise<SavedRow | null | undefined>;
  /** Names a change in the list of failed saves, e.g. "app.title: German". */
  describe: (change: DraftChange, item: Item | undefined) => string;
  /** i18n keys of the toasts after saving: everything, or only some. */
  messages: { saved: string; partial: string };
  /** Runs after saving, while the page still counts as saving. */
  afterSave?: () => Promise<unknown>;
}) {
  const { t } = useI18n();
  const { showSuccess, showError } = useErrorHelper();

  /** itemId -> localeId -> typed text */
  const forms = ref<Record<string, Record<string, string>>>({});
  /** itemId -> localeId -> text on the server */
  const saved = ref<Record<string, Record<string, string>>>({});
  /** The items as last loaded, with their saved rows. */
  const known = ref<Record<string, Item>>({}) as Ref<Record<string, Item>>;
  const isSaving = ref(false);
  const showDiscardDialog = ref(false);

  /** Takes in an item as loaded from the server; its drafts stay. */
  function register(item: Item) {
    if (!item.id) return;

    const rows = [...(options.rows(item) ?? [])];
    const copy = { ...item };

    options.setRows(copy, rows);
    known.value[item.id] = copy;

    const next = Object.fromEntries(
      rows
        .filter((row) => !!row.localeId)
        .map((row) => [String(row.localeId), row.translation ?? ""]),
    );
    const previous = saved.value[item.id] ?? {};
    const drafts = forms.value[item.id] ?? {};
    const merged = { ...next };

    for (const [localeId, value] of Object.entries(drafts)) {
      if (value !== (previous[localeId] ?? "")) merged[localeId] = value;
    }

    forms.value[item.id] = merged;
    saved.value[item.id] = next;
  }

  /** Drops everything kept for a deleted item. */
  function forget(itemId: string) {
    Reflect.deleteProperty(forms.value, itemId);
    Reflect.deleteProperty(saved.value, itemId);
    Reflect.deleteProperty(known.value, itemId);
  }

  function setForm(
    itemId: string,
    localeId: string,
    value: string | undefined,
  ) {
    if (value === undefined) return;
    forms.value[itemId] ??= {};
    forms.value[itemId][localeId] = value;
  }

  function isDirty(itemId: string, localeId: string) {
    return (
      (forms.value[itemId]?.[localeId] ?? "") !==
      (saved.value[itemId]?.[localeId] ?? "")
    );
  }

  function hasUnsaved(itemId: string) {
    return Object.keys(forms.value[itemId] ?? {}).some((localeId) =>
      isDirty(itemId, localeId),
    );
  }

  /** The typed texts of the selected item. */
  const currentForms = computed(() => {
    const id = options.selectedId.value;

    return id ? (forms.value[id] ?? {}) : {};
  });

  /** The languages of the selected item with unsaved text. */
  const unsavedLocaleIds = computed(() => {
    const id = options.selectedId.value;

    return id
      ? Object.keys(forms.value[id] ?? {}).filter((localeId) =>
          isDirty(id, localeId),
        )
      : [];
  });

  const allUnsaved = computed<DraftChange[]>(() =>
    Object.entries(forms.value).flatMap(([itemId, translations]) =>
      Object.entries(translations)
        .filter(([localeId]) => isDirty(itemId, localeId))
        .map(([localeId, translation]) => ({ itemId, localeId, translation })),
    ),
  );
  const allUnsavedCount = computed(() => allUnsaved.value.length);

  registerUnsavedChanges(options.name, allUnsavedCount, isSaving);

  function discardChanges() {
    showDiscardDialog.value = false;

    for (const itemId of Object.keys(forms.value)) {
      forms.value[itemId] = { ...(saved.value[itemId] ?? {}) };
    }
  }

  /** Changes on the open item go right away; others are out of sight, so confirm. */
  function requestDiscardAll() {
    const onlyCurrent = allUnsaved.value.every(
      (change) => change.itemId === options.selectedId.value,
    );

    if (onlyCurrent) discardChanges();
    else showDiscardDialog.value = true;
  }

  /**
   * Saves the changes side by side. Saved ones count as saved even when others
   * fail; the toast lists the failures. `label` names what was saved.
   */
  async function save(changes: DraftChange[], label: string) {
    if (!changes.length || isSaving.value) return;

    isSaving.value = true;

    try {
      const results = await Promise.allSettled(
        changes.map((change) => {
          const item = known.value[change.itemId];
          const existing = item
            ? (options.rows(item) ?? []).find(
                (row) => row.localeId === change.localeId,
              )
            : undefined;

          return options.upsert(change, existing);
        }),
      );

      const failures: string[] = [];

      for (const [index, result] of results.entries()) {
        const change = changes[index]!;

        if (result.status === "rejected") {
          failures.push(options.describe(change, known.value[change.itemId]));

          continue;
        }

        const { itemId, localeId, translation } = change;

        saved.value[itemId] ??= {};
        saved.value[itemId][localeId] = translation;

        const item = known.value[itemId];

        if (result.value?.id && item) {
          options.setRows(item, [
            ...(options.rows(item) ?? []).filter(
              (row) => row.localeId !== localeId,
            ),
            result.value,
          ]);
        }
      }

      if (!failures.length) {
        showSuccess(t(options.messages.saved, { label }));
      } else {
        const message = t(options.messages.partial, {
          saved: results.length - failures.length,
          total: results.length,
          failures: failures.join(", "),
        });

        // Partly saved still reads as success, with the failures listed.
        if (failures.length === results.length) showError(message);
        else showSuccess(message);
      }

      await options.afterSave?.();
    } finally {
      isSaving.value = false;
    }
  }

  return {
    forms,
    saved,
    known,
    isSaving,
    showDiscardDialog,
    register,
    forget,
    setForm,
    isDirty,
    hasUnsaved,
    currentForms,
    unsavedLocaleIds,
    allUnsaved,
    allUnsavedCount,
    discardChanges,
    requestDiscardAll,
    save,
  };
}
