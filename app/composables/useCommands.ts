import type { CommandPaletteItem } from "@thkzt/eunoia";

/** An entry of the command palette, and what choosing it does. */
export type AppCommand = CommandPaletteItem & { run: () => unknown };

type CommandRegistry = {
  open: Ref<boolean>;
  sources: Ref<(() => AppCommand[])[]>;
};

/** Opens the command palette on every page. "Mod" is ⌘ on macOS and Ctrl elsewhere. */
export const PALETTE_SHORTCUT = "Mod+K";

export const COMMANDS_KEY = Symbol("commands");

/**
 * The command palette's state, provided by the layout so the palette is there on
 * every page. Pages add their own commands with useCommands.
 */
export function useCommandsProvider() {
  const open = ref(false);
  const sources = shallowRef<(() => AppCommand[])[]>([]);

  provide<CommandRegistry>(COMMANDS_KEY, { open, sources });

  return {
    open,
    /** What the open page added. */
    commands: computed(() => sources.value.flatMap((source) => source())),
  };
}

/** Whether the command palette shows; setting it opens or closes the palette. */
export function useCommandPalette() {
  const registry = inject<CommandRegistry | null>(COMMANDS_KEY, null);

  return { open: registry?.open ?? ref(false) };
}

/**
 * Adds the page's commands to the palette for as long as the page is open. They are
 * listed before the commands every page has, such as going to another page.
 */
export function useCommands(commands: () => AppCommand[]) {
  const registry = inject<CommandRegistry | null>(COMMANDS_KEY, null);

  if (registry) {
    registry.sources.value = [...registry.sources.value, commands];
    onScopeDispose(() => {
      registry.sources.value = registry.sources.value.filter(
        (source) => source !== commands,
      );
    });
  }

  return { open: registry?.open ?? ref(false) };
}
