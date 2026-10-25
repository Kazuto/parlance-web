import type { ActionMenuItem, SplitViewItem } from "@thkzt/eunoia";
import type { Ref } from "vue";
import { EDITOR_SHORTCUTS } from "~/composables/editor/useEditorShortcuts";
import { useCommands, type AppCommand } from "~/composables/useCommands";

// Searching thousands of keys would slow the palette down; the list search is for that.
const MAX_ENTRIES = 500;

/**
 * What the entry editor adds to the command palette: what can be done with the
 * open entry, the loaded entries to jump to and the status filters.
 */
export function useEditorCommands(options: {
  /** The entry header's actions, which bring their own permissions and blockers. */
  entryActions: Ref<ActionMenuItem[]>;
  entries: Ref<SplitViewItem[]>;
  statusOptions: Ref<{ label: string; value: string }[]>;
  canSave: () => boolean;
  canCreate: () => boolean;
  canReview: () => boolean;
  /** Whether the open entry has drafts in the shown languages to approve. */
  hasDrafts: () => boolean;
  canEdit: () => boolean;
  /** The language whose field had the focus when the palette opened. */
  focusedLanguage: () => { name: string; isDefault: boolean } | undefined;
  handlers: {
    action: (value: string) => unknown;
    save: () => unknown;
    saveAndNext: () => unknown;
    previous: () => unknown;
    next: () => unknown;
    approveAll: () => unknown;
    copySource: () => unknown;
    toggleContext: () => unknown;
    focusSearch: () => unknown;
    create: () => unknown;
    entry: (id: string) => unknown;
    status: (value: string) => unknown;
  };
}) {
  const { t } = useI18n();
  const { handlers } = options;

  const commands = computed<AppCommand[]>(() => {
    const entryGroup = t("commands.groupEntry");
    const commands: AppCommand[] = [
      {
        label: t("common.saveChanges"),
        value: "save",
        run: handlers.save,
        group: entryGroup,
        icon: "floppy-disk",
        shortcut: EDITOR_SHORTCUTS.save,
        disabled: !options.canSave(),
      },
      {
        label: t("commands.saveAndNext"),
        value: "saveAndNext",
        run: handlers.saveAndNext,
        group: entryGroup,
        icon: "arrow-down",
        shortcut: EDITOR_SHORTCUTS.saveAndNext,
      },
      {
        label: t("commands.previousEntry"),
        value: "previous",
        run: handlers.previous,
        group: entryGroup,
        icon: "caret-up",
        shortcut: EDITOR_SHORTCUTS.previous,
      },
      {
        label: t("commands.nextEntry"),
        value: "next",
        run: handlers.next,
        group: entryGroup,
        icon: "caret-down",
        shortcut: EDITOR_SHORTCUTS.next,
      },
    ];

    if (options.canReview()) {
      commands.push({
        label: t("commands.approveAll"),
        value: "approveAll",
        run: handlers.approveAll,
        group: entryGroup,
        icon: "seal-check",
        shortcut: EDITOR_SHORTCUTS.approveAll,
        disabled: !options.hasDrafts(),
      });
    }

    // Listed without a focused field too, so its key can be found; it names the
    // language it acts on once there is one.
    const focused = options.focusedLanguage();

    if (options.canEdit()) {
      commands.push({
        label: focused
          ? t("commands.copySourceTo", { language: focused.name })
          : t("commands.copySourceFocused"),
        value: "copySource",
        run: handlers.copySource,
        group: entryGroup,
        icon: "copy",
        shortcut: EDITOR_SHORTCUTS.copySource,
        disabled: !focused || focused.isDefault,
      });
    }

    commands.push(
      // Approving has its own command above, with its key.
      ...options.entryActions.value
        .filter((action) => action.value !== "approve")
        .map((action) => ({
          label: action.label,
          value: `action:${action.value}`,
          run: () => handlers.action(action.value),
          group: entryGroup,
          icon: action.icon,
          disabled: action.disabled,
        })),
      {
        label: t("commands.toggleContext"),
        value: "toggleContext",
        run: handlers.toggleContext,
        group: entryGroup,
        icon: "sidebar",
      },
      {
        label: t("commands.focusSearch"),
        value: "focusSearch",
        run: handlers.focusSearch,
        group: entryGroup,
        icon: "magnifying-glass",
        shortcut: "/",
      },
    );

    if (options.canCreate()) {
      commands.push({
        label: t("entries.create"),
        value: "create",
        run: handlers.create,
        group: entryGroup,
        icon: "plus",
      });
    }

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

    const entriesGroup = t("commands.groupEntries");

    for (const entry of options.entries.value.slice(0, MAX_ENTRIES)) {
      commands.push({
        label: entry.label,
        value: `entry:${entry.key}`,
        run: () => handlers.entry(String(entry.key)),
        group: entriesGroup,
        icon: "translate",
        keywords: [String(entry.defaultTranslation ?? "")],
      });
    }

    return commands;
  });

  return useCommands(() => commands.value);
}
