<script setup lang="ts">
import { Button, Checkbox, Dialog } from "@thkzt/eunoia";

// Asks which of the shown languages AI translation writes into, once some of them
// have text: the empty ones are ticked, the others only replaced when ticked. The
// results are unsaved changes to review, like for empty languages.
const props = defineProps<{
  open: boolean;
  /** The entry's key, for the title. */
  entryKey: string;
  /** The languages to choose from, with the text each has now. */
  choices: { id: string; label: string; text: string }[];
}>();

const emit = defineEmits<{ close: []; translate: [localeIds: string[]] }>();
const { t } = useI18n();

const ticked = ref<string[]>([]);

watch(
  () => props.open,
  (open) => {
    if (open)
      ticked.value = props.choices
        .filter((choice) => !choice.text.trim())
        .map((choice) => choice.id);
  },
  { immediate: true },
);

function toggle(id: string, on?: boolean) {
  ticked.value = on
    ? [...ticked.value, id]
    : ticked.value.filter((tickedId) => tickedId !== id);
}

// In the order the languages are shown.
const selected = computed(() =>
  props.choices
    .map((choice) => choice.id)
    .filter((id) => ticked.value.includes(id)),
);
</script>

<template>
  <Dialog
    :open
    :title="t('entries.translateTitle', { key: entryKey })"
    @close="emit('close')"
  >
    <p class="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
      {{ t("entries.translateIntro") }}
    </p>
    <div class="flex flex-col gap-2" data-testid="translate-choices">
      <Checkbox
        v-for="choice in choices"
        :key="choice.id"
        :model-value="ticked.includes(choice.id)"
        @update:model-value="toggle(choice.id, $event)"
      >
        <template #description>
          <span class="flex min-w-0 flex-col">
            <span class="font-medium">{{ choice.label }}</span>
            <span
              class="truncate text-xs text-neutral-500 dark:text-neutral-400"
              :class="{ italic: !choice.text.trim() }"
            >
              {{ choice.text.trim() || t("entries.translateEmptyText") }}
            </span>
          </span>
        </template>
      </Checkbox>
    </div>
    <template #footer>
      <div class="flex justify-end gap-3">
        <Button type="button" ghost @click="emit('close')">
          {{ t("common.cancel") }}
        </Button>
        <Button
          type="button"
          primary
          :disabled="!selected.length"
          @click="emit('translate', selected)"
        >
          {{
            t(
              "entries.translateCount",
              { count: selected.length },
              selected.length,
            )
          }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
