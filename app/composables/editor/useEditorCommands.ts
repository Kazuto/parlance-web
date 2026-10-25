import type {
  ActionMenuItem,
  CommandPaletteItem,
  SplitViewItem,
} from "@thkzt/eunoia";
import type { Ref } from "vue";
import { EDITOR_SHORTCUTS } from "~/composables/editor/useEditorShortcuts";

// Searching thousands of keys would slow the palette down; the list search is for that.
const MAX_ENTRIES = 500;

/**
 * The command palette of the entry editor: what can be done with the open entry,
 * the loaded entries to jump to, the status filters and the other pages.
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
  const { mainItems, settingsItems } = useNavigation();

  const items = computed<CommandPaletteItem[]>(() => {
    const entryGroup = t("commands.groupEntry");
    const commands: CommandPaletteItem[] = [
      {
        label: t("common.saveChanges"),
        value: "save",
        group: entryGroup,
        icon: "floppy-disk",
        shortcut: EDITOR_SHORTCUTS.save,
        disabled: !options.canSave(),
      },
      {
        label: t("commands.saveAndNext"),
        value: "saveAndNext",
        group: entryGroup,
        icon: "arrow-down",
        shortcut: EDITOR_SHORTCUTS.saveAndNext,
      },
      {
        label: t("commands.previousEntry"),
        value: "previous",
        group: entryGroup,
        icon: "caret-up",
        shortcut: EDITOR_SHORTCUTS.previous,
      },
      {
        label: t("commands.nextEntry"),
        value: "next",
        group: entryGroup,
        icon: "caret-down",
        shortcut: EDITOR_SHORTCUTS.next,
      },
    ];

    if (options.canReview()) {
      commands.push({
        label: t("commands.approveAll"),
        value: "approveAll",
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
          group: entryGroup,
          icon: action.icon,
          disabled: action.disabled,
        })),
      {
        label: t("commands.toggleContext"),
        value: "toggleContext",
        group: entryGroup,
        icon: "sidebar",
      },
      {
        label: t("commands.focusSearch"),
        value: "focusSearch",
        group: entryGroup,
        icon: "magnifying-glass",
        shortcut: "/",
      },
    );

    if (options.canCreate()) {
      commands.push({
        label: t("entries.create"),
        value: "create",
        group: entryGroup,
        icon: "plus",
      });
    }

    const filterGroup = t("commands.groupFilter");

    for (const option of options.statusOptions.value) {
      commands.push({
        label: t("commands.showStatus", { status: option.label }),
        value: `status:${option.value}`,
        group: filterGroup,
        icon: "funnel",
      });
    }

    const entriesGroup = t("commands.groupEntries");

    for (const entry of options.entries.value.slice(0, MAX_ENTRIES)) {
      commands.push({
        label: entry.label,
        value: `entry:${entry.key}`,
        group: entriesGroup,
        icon: "translate",
        keywords: [String(entry.defaultTranslation ?? "")],
      });
    }

    const pagesGroup = t("commands.groupPages");

    for (const page of [...mainItems.value, ...settingsItems.value]) {
      if (!page.to) continue;
      commands.push({
        label: page.label,
        value: `page:${page.to}`,
        group: pagesGroup,
        icon: page.icon,
      });
    }

    return commands;
  });

  function run(value: string) {
    // Page paths and ids follow the first colon; plain commands have none.
    const separator = value.indexOf(":");
    const kind = separator < 0 ? value : value.slice(0, separator);
    const argument = value.slice(separator + 1);
    const { handlers } = options;

    if (kind === "action") handlers.action(argument);
    else if (kind === "entry") handlers.entry(argument);
    else if (kind === "status") handlers.status(argument);
    else if (kind === "page") navigateTo(argument);
    else if (kind in handlers)
      (handlers[kind as keyof typeof handlers] as () => unknown)();
  }

  return { items, run };
}
