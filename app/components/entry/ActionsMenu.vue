<script setup lang="ts">
import { Button, Icon } from "@thkzt/eunoia";
import { onClickOutside, useEventListener } from "@vueuse/core";

const props = withDefaults(
  defineProps<{ disabled?: boolean; subject?: string }>(),
  { subject: "entry" },
);
const emit = defineEmits<{ edit: []; delete: [] }>();
const open = ref(false);
const trigger = useTemplateRef("trigger");
const menu = useTemplateRef("menu");
const position = ref({ top: "0px", left: "0px" });

function close() {
  open.value = false;
}

async function toggle() {
  if (props.disabled) return;
  if (open.value) return close();
  const rect = trigger.value?.getBoundingClientRect();
  if (!rect) return;
  position.value = {
    top: `${rect.bottom + 4}px`,
    left: `${Math.max(8, Math.min(rect.right - 176, window.innerWidth - 184))}px`,
  };
  open.value = true;
  await nextTick();
  menu.value?.querySelector<HTMLButtonElement>("button")?.focus();
}

function choose(action: "edit" | "delete") {
  if (props.disabled) return;
  close();
  if (action === "edit") emit("edit");
  else emit("delete");
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    close();
    trigger.value?.querySelector<HTMLButtonElement>("button")?.focus();
  } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    const buttons = Array.from(
      menu.value?.querySelectorAll<HTMLButtonElement>("button") ?? [],
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (index + (event.key === "ArrowUp" ? -1 : 1) + buttons.length) %
            buttons.length;
    buttons[next]?.focus();
  }
}

onClickOutside(menu, close, { ignore: [trigger] });
useEventListener("resize", close);
watch(() => props.disabled, close);
</script>

<template>
  <div ref="trigger" class="shrink-0">
    <Button
      type="button"
      ghost
      icon="dots-three-vertical"
      :aria-label="`${subject} actions`"
      aria-haspopup="menu"
      :aria-expanded="open"
      :disabled="disabled"
      @click="toggle"
    />
  </div>
  <Teleport to="body">
    <div
      v-if="open"
      ref="menu"
      role="menu"
      :aria-label="`${subject} actions`"
      :style="position"
      class="fixed z-50 w-44 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
      @keydown="onKeydown"
      @focusout="
        (event) => {
          if (!menu?.contains(event.relatedTarget as Node)) close();
        }
      "
    >
      <button
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
        @click="choose('edit')"
      >
        <Icon name="pencil" size="sm" />Edit {{ subject }}
      </button>
      <div
        role="separator"
        class="my-1 border-t border-neutral-200 dark:border-neutral-700"
      />
      <button
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
        @click="choose('delete')"
      >
        <Icon name="trash" size="sm" />Delete {{ subject }}
      </button>
    </div>
  </Teleport>
</template>
