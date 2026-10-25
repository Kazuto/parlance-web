import { useShortcut } from "@thkzt/eunoia";

// The editor's keyboard shortcuts, in one place so buttons and the command palette
// show the keys that work. "Mod" is ⌘ on macOS and Ctrl elsewhere.
export const EDITOR_SHORTCUTS = {
  save: "Mod+S",
  saveAndNext: "Mod+Enter",
  previous: "Alt+ArrowUp",
  next: "Alt+ArrowDown",
  approveAll: "Alt+Enter",
  copySource: "Mod+D",
} as const;

type EditorAction = keyof typeof EDITOR_SHORTCUTS;

/**
 * Binds the editor's shortcuts while the page is open. They work while typing in a
 * field, but not while a dialog, such as the command palette, covers the editor.
 */
export function useEditorShortcuts(
  handlers: Record<EditorAction, () => unknown>,
) {
  for (const action of Object.keys(handlers) as EditorAction[]) {
    useShortcut(EDITOR_SHORTCUTS[action], () => {
      if (document.querySelector("dialog[open]")) return;
      handlers[action]();
    });
  }
}
