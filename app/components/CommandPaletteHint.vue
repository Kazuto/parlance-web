<script setup lang="ts">
import { Kbd } from "@thkzt/eunoia";
import { PALETTE_SHORTCUT } from "~/composables/useCommands";

// Shows the key that opens the command palette, and opens it when clicked.
const { open } = useCommandPalette();
const { t } = useI18n();
</script>

<template>
  <button
    type="button"
    class="flex cursor-pointer items-center gap-1.5 rounded-lg text-xs text-neutral-500 hover:text-neutral-800 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none dark:text-neutral-400 dark:hover:text-neutral-100"
    @click="open = true"
  >
    <Kbd :shortcut="PALETTE_SHORTCUT" dense />
    {{ t("commands.open") }}
  </button>
</template>
