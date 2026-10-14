<script setup lang="ts">
import { Badge, Button, Checkbox, Select } from "@thkzt/eunoia";
import { onClickOutside, useEventListener } from "@vueuse/core";

type Option = { label: string; value: string };

const props = defineProps<{
  localeOptions: Option[];
  scopeOptions: Option[];
  statusOptions: Option[];
  disabled?: boolean;
  activeCount: number;
}>();
const localeIds = defineModel<string[]>("localeIds", { required: true });
const scopeIds = defineModel<string[]>("scopeIds", { required: true });
const status = defineModel<string>("status", { required: true });
const emit = defineEmits<{ clear: [] }>();

const { t } = useI18n();
const open = ref(false);
const trigger = useTemplateRef("trigger");
const panel = useTemplateRef("panel");
const position = ref({ top: "0px", left: "0px" });
const PANEL_WIDTH = 352;

const allLanguagesSelected = computed(
  () =>
    props.localeOptions.length > 0 &&
    props.localeOptions.every((locale) =>
      localeIds.value.includes(locale.value),
    ),
);
const someLanguagesSelected = computed(
  () => localeIds.value.length > 0 && !allLanguagesSelected.value,
);

function toggleAllLanguages(checked: boolean | undefined) {
  localeIds.value = checked
    ? props.localeOptions.map((locale) => locale.value)
    : [];
}

function toggleLanguage(id: string, checked: boolean | undefined) {
  localeIds.value = checked
    ? [...localeIds.value.filter((item) => item !== id), id]
    : localeIds.value.filter((item) => item !== id);
}

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
    left: `${Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8))}px`,
  };
  open.value = true;
  await nextTick();
  panel.value?.querySelector<HTMLElement>("input, [tabindex='0']")?.focus();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  close();
  trigger.value?.querySelector<HTMLButtonElement>("button")?.focus();
}

onClickOutside(panel, close, { ignore: [trigger] });
useEventListener("resize", close);
watch(() => props.disabled, close);
</script>

<template>
  <div ref="trigger" class="shrink-0">
    <Button
      type="button"
      ghost
      dense
      icon="funnel"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :disabled="disabled"
      @click="toggle"
    >
      {{ t("entries.filters") }}
      <Badge v-if="activeCount" dense pill class="ml-1">{{
        activeCount
      }}</Badge>
    </Button>
  </div>
  <Teleport to="body">
    <div
      v-if="open"
      ref="panel"
      role="dialog"
      :aria-label="t('entries.filters')"
      :style="{
        ...position,
        width: `min(${PANEL_WIDTH}px, calc(100vw - 16px))`,
      }"
      class="fixed z-50 flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
      @keydown="onKeydown"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-medium">{{ t("entries.filters") }}</span>
        <Button
          type="button"
          ghost
          dense
          :disabled="!activeCount"
          @click="emit('clear')"
        >
          {{ t("entries.clearFilters") }}
        </Button>
      </div>

      <fieldset class="flex flex-col gap-2">
        <legend class="mb-2 text-xs font-medium text-neutral-500">
          {{ t("entries.languages") }}
        </legend>
        <Checkbox
          dense
          :model-value="allLanguagesSelected"
          :indeterminate="someLanguagesSelected"
          @update:model-value="toggleAllLanguages"
        >
          <template #description>{{ t("entries.allLanguages") }}</template>
        </Checkbox>
        <div
          class="flex max-h-48 flex-col gap-2 overflow-y-auto border-t border-neutral-200 pt-2 dark:border-neutral-700"
        >
          <Checkbox
            v-for="locale in localeOptions"
            :key="locale.value"
            dense
            :model-value="localeIds.includes(locale.value)"
            @update:model-value="toggleLanguage(locale.value, $event)"
          >
            <template #description>{{ locale.label }}</template>
          </Checkbox>
        </div>
      </fieldset>

      <label class="flex flex-col gap-1">
        <span class="text-xs font-medium text-neutral-500">{{
          t("scopes.title")
        }}</span>
        <Select
          :model-value="scopeIds"
          dense
          multiple
          :options="scopeOptions"
          :placeholder="t('scopes.all')"
          :aria-label="t('scopes.title')"
          @update:model-value="
            scopeIds = Array.isArray($event) ? $event.map(String) : []
          "
        />
      </label>

      <label class="flex flex-col gap-1">
        <span class="text-xs font-medium text-neutral-500">{{
          t("entries.translationStatus")
        }}</span>
        <Select
          v-model="status"
          dense
          :options="statusOptions"
          :aria-label="t('entries.translationStatus')"
        />
        <span class="text-xs text-neutral-500">{{
          t(
            localeIds.length
              ? "entries.filterSelectedHelp"
              : "entries.filterAllHelp",
          )
        }}</span>
      </label>
    </div>
  </Teleport>
</template>
