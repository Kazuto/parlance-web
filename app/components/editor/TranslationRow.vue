<script setup lang="ts">
import { Icon, Tooltip } from "@thkzt/eunoia";

// One language of the item being edited: label column, text field, and the button
// that opens this language in the context panel.
const props = defineProps<{
  inputId: string;
  localeName: string;
  localeCode: string;
  isDefault?: boolean;
  /** Whether the language has text; drives the status dot and field style. */
  translated: boolean;
  dirty?: boolean;
  /** The context panel currently shows this language. */
  active?: boolean;
  readonly?: boolean;
  placeholder?: string;
  /** Pages without a context panel hide the button and its column. */
  withoutContext?: boolean;
}>();
const emit = defineEmits<{ "open-context": []; focus: []; revert: [] }>();
defineSlots<{
  /** Under the locale code, e.g. glossary term matches or copy-to-empty. */
  meta?: () => unknown;
}>();
const value = defineModel<string>({ default: "" });
const { t } = useI18n();

const contextLabel = computed(() =>
  t("context.openFor", { language: props.localeName }),
);

// Light mode mirrors dark: filled fields stand out from the group behind them and
// empty ones stay faint. The default row is a white card, so its field is gray instead.
const fieldClass = computed(() => {
  if (props.translated)
    return props.isDefault
      ? "bg-neutral-100 dark:bg-neutral-800"
      : "bg-white dark:bg-neutral-800";
  return props.isDefault
    ? "bg-neutral-100/60 dark:bg-white/[0.03]"
    : "bg-white/50 dark:bg-white/[0.03]";
});

const contextButtonClass = computed(() => {
  if (props.active)
    return "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-200";
  return props.isDefault
    ? "bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400"
    : "bg-white text-neutral-500 dark:bg-white/5 dark:text-neutral-400";
});
</script>

<template>
  <div
    class="grid items-start gap-3 rounded-[18px] py-2.5 pr-2.5 pl-3.5 squircle"
    :class="[
      withoutContext
        ? 'grid-cols-[150px_minmax(0,1fr)] max-sm:grid-cols-1'
        : 'grid-cols-[150px_minmax(0,1fr)_32px] max-sm:grid-cols-[minmax(0,1fr)_32px]',
      isDefault
        ? 'bg-white shadow-sm dark:bg-neutral-800/60 dark:shadow-none'
        : '',
    ]"
  >
    <div
      class="flex min-w-0 flex-col gap-1"
      :class="{ 'max-sm:col-span-2': !withoutContext }"
    >
      <div class="flex max-w-full min-w-0 items-center gap-1.5 self-start">
        <label
          :for="inputId"
          class="group inline-flex min-w-0 cursor-pointer items-center gap-1.5"
        >
          <span
            class="size-1.5 shrink-0 rounded-full"
            :class="
              translated
                ? 'bg-green-400 dark:bg-green-300'
                : 'bg-red-400 dark:bg-rose-300'
            "
            :title="
              t(
                translated
                  ? 'entries.filterComplete'
                  : 'entries.missingTranslations',
              )
            "
          />
          <span
            class="truncate text-[13px] font-bold transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-300"
            >{{ localeName }}</span
          >
          <span
            class="shrink-0 font-mono text-[10px] text-neutral-500 dark:text-neutral-400"
            >{{ localeCode }}</span
          >
        </label>
        <template v-if="dirty">
          <span
            class="shrink-0 text-[10.5px] font-semibold text-yellow-700 dark:text-amber-300"
            >{{ t("common.unsaved") }}</span
          >
          <Tooltip :content="t('common.revert')">
            <button
              type="button"
              class="grid size-5 shrink-0 cursor-pointer place-items-center rounded-[100%] text-yellow-700 superellipse hover:bg-yellow-50 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-300 dark:hover:bg-amber-400/15"
              :disabled="readonly"
              :aria-label="t('common.revertFor', { language: localeName })"
              @click="emit('revert')"
            >
              <Icon name="arrow-counter-clockwise" size="xs" />
            </button>
          </Tooltip>
        </template>
      </div>
      <span
        v-if="isDefault"
        class="pl-3 text-[10.5px] font-bold text-primary-600 dark:text-primary-300"
        >{{ t("common.default") }}</span
      >
      <div v-if="$slots.meta" class="pl-3">
        <slot name="meta" />
      </div>
    </div>
    <textarea
      :id="inputId"
      v-model="value"
      :readonly
      :placeholder
      rows="1"
      class="min-h-[38px] w-full resize-y rounded-[13px] supports-[field-sizing:content]:resize-none px-3 py-2.5 text-[13.5px] text-neutral-900 outline-none squircle [field-sizing:content] placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-neutral-50 dark:placeholder:text-neutral-500"
      :class="fieldClass"
      @focus="emit('focus')"
    />
    <div v-if="!withoutContext" class="flex flex-col items-center gap-1">
      <BaseIconButton
        icon="sidebar"
        :label="contextLabel"
        :aria-pressed="active"
        :class="contextButtonClass"
        @click="emit('open-context')"
      />
    </div>
  </div>
</template>
