import type { ActionMenuItem, SplitViewItem } from "@thkzt/eunoia";
import type { Ref } from "vue";
import { EDITOR_SHORTCUTS } from "~/composables/editor/useEditorShortcuts";
import { useCommands, type AppCommand } from "~/composables/useCommands";

// Searching thousands of keys would slow the palette down; the list search is for that.
const MAX_ITEMS = 500;

/** The i18n keys of the commands that name what the editor edits. */
export type EditorCommandLabels = {
  /** The open item's commands, e.g. "This entry" */
  group: string;
  /** The loaded items to go to, e.g. "Go to entry" */
  items: string;
  previous: string;
  next: string;
  saveAndNext: string;
  search: string;
};

/**
 * What an editor (entries, glossary) adds to the command palette: what can be done
 * with the open item, the loaded items to jump to and the status filters. Creating
 * one is the page's header action, which the palette lists as well.
 */
export function useEditorCommands(options: {
  labels: EditorCommandLabels;
  /** The icon of the items to go to */
  itemIcon: string;
  /** The open item's header actions, which bring their own permissions and blockers. */
  actions: Ref<ActionMenuItem[]>;
  items: Ref<SplitViewItem[]>;
  /** What else finds an item, e.g. an entry's default text */
  itemKeywords: (item: SplitViewItem) => string[];
  statusOptions: Ref<{ label: string; value: string }[]>;
  canSave: () => boolean;
  canReview: () => boolean;
  /** Whether the open item has drafts in the shown languages to approve. */
  hasDrafts: () => boolean;
  /** Copying the default text into the focused field, where the editor has it. */
  copySource?: {
    canEdit: () => boolean;
    /** The language whose field had the focus when the palette opened. */
    focusedLanguage: () => { name: string; isDefault: boolean } | undefined;
    run: () => unknown;
  };
  handlers: {
    action: (value: string) => unknown;
    save: () => unknown;
    saveAndNext: () => unknown;
    previous: () => unknown;
    next: () => unknown;
    approveAll: () => unknown;
    toggleContext: () => unknown;
    focusSearch: () => unknown;
    item: (id: string) => unknown;
    status: (value: string) => unknown;
  };
}) {
  const { t } = useI18n();
  const { handlers, labels, copySource } = options;

  const commands = computed<AppCommand[]>(() => {
    const itemGroup = t(labels.group);
    const commands: AppCommand[] = [
      {
        label: t("common.saveChanges"),
        value: "save",
        run: handlers.save,
        group: itemGroup,
        icon: "floppy-disk",
        shortcut: EDITOR_SHORTCUTS.save,
        disabled: !options.canSave(),
      },
      {
        label: t(labels.saveAndNext),
        value: "saveAndNext",
        run: handlers.saveAndNext,
        group: itemGroup,
        icon: "arrow-down",
        shortcut: EDITOR_SHORTCUTS.saveAndNext,
      },
      {
        label: t(labels.previous),
        value: "previous",
        run: handlers.previous,
        group: itemGroup,
        icon: "caret-up",
        shortcut: EDITOR_SHORTCUTS.previous,
      },
      {
        label: t(labels.next),
        value: "next",
        run: handlers.next,
        group: itemGroup,
        icon: "caret-down",
        shortcut: EDITOR_SHORTCUTS.next,
      },
    ];

    if (options.canReview()) {
      commands.push({
        label: t("commands.approveAll"),
        value: "approveAll",
        run: handlers.approveAll,
        group: itemGroup,
        icon: "seal-check",
        shortcut: EDITOR_SHORTCUTS.approveAll,
        disabled: !options.hasDrafts(),
      });
    }

    // Listed without a focused field too, so its key can be found; it names the
    // language it acts on once there is one.
    const focused = copySource?.focusedLanguage();

    if (copySource?.canEdit()) {
      commands.push({
        label: focused
          ? t("commands.copySourceTo", { language: focused.name })
          : t("commands.copySourceFocused"),
        value: "copySource",
        run: copySource.run,
        group: itemGroup,
        icon: "copy",
        shortcut: EDITOR_SHORTCUTS.copySource,
        disabled: !focused || focused.isDefault,
      });
    }

    commands.push(
      // Approving has its own command above, with its key.
      ...options.actions.value
        .filter((action) => action.value !== "approve")
        .map((action) => ({
          label: action.label,
          value: `action:${action.value}`,
          run: () => handlers.action(action.value),
          group: itemGroup,
          icon: action.icon,
          disabled: action.disabled,
        })),
      {
        label: t("commands.toggleContext"),
        value: "toggleContext",
        run: handlers.toggleContext,
        group: itemGroup,
        icon: "sidebar",
      },
      {
        label: t(labels.search),
        value: "focusSearch",
        run: handlers.focusSearch,
        group: itemGroup,
        icon: "magnifying-glass",
        shortcut: "/",
      },
    );

    const filterGroup = t("commands.groupFilter");

    for (const option of options.statusOptions.value) {
      commands.push({
        label: t("commands.showStatus", { status: option.label }),
        value: `status:${option.value}`,
        run: () => handlers.status(option.value),
        group: filterGroup,
        icon: "funnel",
      });
    }

    const itemsGroup = t(labels.items);

    for (const item of options.items.value.slice(0, MAX_ITEMS)) {
      commands.push({
        label: item.label,
        value: `item:${item.key}`,
        run: () => handlers.item(String(item.key)),
        group: itemsGroup,
        icon: options.itemIcon,
        keywords: options.itemKeywords(item),
      });
    }

    return commands;
  });

  return useCommands(() => commands.value);
}
