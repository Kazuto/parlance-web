<script setup lang="ts">
import { CommandPalette } from "@thkzt/eunoia";
import { PALETTE_SHORTCUT, type AppCommand } from "~/composables/useCommands";

// The command palette every page has: what the open page offers, then the pages to
// go to.
const props = defineProps<{
  /** The open page's commands. */
  commands: AppCommand[];
}>();
const open = defineModel<boolean>("open", { default: false });
const { t } = useI18n();
const { mainItems, settingsItems, accountItem } = useNavigation();

const pages = computed<AppCommand[]>(() =>
  [...mainItems.value, ...settingsItems.value, accountItem.value].flatMap(
    (page) =>
      page.to
        ? [
            {
              label: page.label,
              value: `page:${page.to}`,
              group: t("commands.groupPages"),
              icon: page.icon,
              run: () => navigateTo(page.to),
            },
          ]
        : [],
  ),
);
const commands = computed(() => [...props.commands, ...pages.value]);
// The palette renders its items while closed too, so they are only built while it
// shows; the entry editor lists hundreds.
const items = computed(() =>
  open.value ? commands.value.map(({ run: _run, ...item }) => item) : [],
);

// Closing the palette gives the focus back to where it was, so commands that move
// the focus or open a dialog wait until it has closed.
function onSelect(value: string) {
  const command = commands.value.find((item) => item.value === value);

  if (command) setTimeout(() => command.run());
}
</script>

<template>
  <CommandPalette
    v-model:open="open"
    :items="items"
    :shortcut="PALETTE_SHORTCUT"
    @select="onSelect"
  />
</template>
