<script setup lang="ts">
import { Checkbox, SplitView, type SplitViewItem } from "@thkzt/eunoia";
import { useResizeObserver } from "@vueuse/core";

// An editor's list, open item and context panel on one grid. Their headers share the
// grid's rows, so the list's title, the item's header and the context panel's title
// line up, and so do the column names below them. The context panel places itself in
// the third column; see BaseContextPanel.
const props = defineProps<{
  items: SplitViewItem[];
  selected?: SplitViewItem;
  hasMore?: boolean;
  loading?: boolean;
  /** All items, loaded or not, counted beside the list's title. */
  total?: number;
  /** The list's title, e.g. "Keys". */
  listLabel: string;
  /** Rows can be ticked, e.g. for bulk actions. */
  selectable?: boolean;
  /** On phones the list and the open item take turns; see useCompactEditor. */
  compact: boolean;
  /** On phones, whether the open item shows rather than the list. */
  editorOpen: boolean;
}>();

/** Keys of the ticked rows. */
const selection = defineModel<string[]>("selection", { default: () => [] });

const emit = defineEmits<{ select: [item: SplitViewItem]; endReached: [] }>();

defineSlots<{
  item(props: { item: SplitViewItem }): unknown;
  /** Beside the list's column name, e.g. what the colors of its counts mean. */
  legend?(): unknown;
  header(props: { item: SplitViewItem | undefined }): unknown;
  /** The open item's column names, above its rows. */
  columns?(): unknown;
  default(props: { item: SplitViewItem | undefined }): unknown;
  listFooter?(): unknown;
  empty?(): unknown;
  context?(): unknown;
}>();

const { t } = useI18n();

const listShown = computed(() => !props.compact || !props.editorOpen);
const editorShown = computed(() => !props.compact || props.editorOpen);

const loadedKeys = computed(() => props.items.map((item) => String(item.key)));
const checkedKeys = computed(() => new Set(selection.value));
const allLoadedChecked = computed(
  () =>
    loadedKeys.value.length > 0 &&
    loadedKeys.value.every((key) => checkedKeys.value.has(key)),
);
const someLoadedChecked = computed(
  () =>
    !allLoadedChecked.value &&
    loadedKeys.value.some((key) => checkedKeys.value.has(key)),
);

// Ticks every loaded row, or unticks them once all are. Rows ticked under other
// filters keep their ticks.
function checkLoaded(checked: boolean | undefined) {
  const loaded = new Set(loadedKeys.value);

  selection.value = checked
    ? [...new Set([...selection.value, ...loaded])]
    : selection.value.filter((key) => !loaded.has(key));
}

// A scrollbar beside the rows takes its width from their columns. The column names
// leave the same room, so the columns line up.
const splitView = useTemplateRef<{ $el: HTMLElement }>("splitView");
const rowsScrollbar = ref(0);

useResizeObserver(
  () =>
    splitView.value?.$el.lastElementChild?.lastElementChild as
      | HTMLElement
      | undefined,
  ([entry]) => {
    const rows = entry?.target as HTMLElement | undefined;

    rowsScrollbar.value = rows ? rows.offsetWidth - rows.clientWidth : 0;
  },
);
</script>

<template>
  <!-- The translation rows and their column names share the columns set here. -->
  <div
    class="relative grid min-h-0 flex-1 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden text-neutral-900 [--translation-columns:180px_minmax(0,1fr)_128px] dark:text-neutral-100"
    :class="
      compact
        ? 'grid-cols-[minmax(0,1fr)]'
        : 'grid-cols-[minmax(200px,250px)_minmax(0,1fr)_auto]'
    "
  >
    <template v-if="listShown">
      <div
        class="col-start-1 row-start-1 flex min-h-13 items-center justify-between gap-2 border-b border-neutral-200 px-4 md:border-r dark:border-white/5"
      >
        <h2 class="text-[13px] font-bold">{{ listLabel }}</h2>
        <span
          v-if="total !== undefined"
          class="rounded-[6px] bg-neutral-100 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-neutral-500 squircle dark:bg-white/5 dark:text-neutral-400"
          >{{ total }}</span
        >
      </div>
      <div
        class="col-start-1 row-start-2 flex h-9 items-center gap-2 border-b border-neutral-200 px-4 text-xs font-semibold text-neutral-500 md:border-r dark:border-white/5 dark:text-neutral-400"
      >
        <Checkbox
          v-if="selectable"
          dense
          :model-value="allLoadedChecked"
          :indeterminate="someLoadedChecked"
          :disabled="!items.length"
          :aria-label="t('entries.bulkSelectLoaded', { count: items.length })"
          @update:model-value="checkLoaded"
        />
        <span class="flex-1">{{ t("common.name") }}</span>
        <slot name="legend" />
      </div>
    </template>
    <template v-if="editorShown">
      <div
        class="row-start-1 flex min-h-13 min-w-0 flex-col justify-center gap-2 border-b border-neutral-200 px-4 py-2.5 dark:border-white/5"
        :class="compact ? 'col-start-1' : 'col-start-2'"
      >
        <slot name="header" :item="selected" />
      </div>
      <!-- Phones stack each row's cells, so there are no columns to name. -->
      <div
        class="row-start-2 min-w-0 border-b border-neutral-200 max-md:hidden dark:border-white/5"
        :class="compact ? 'col-start-1' : 'col-start-2'"
        :style="{ paddingRight: `${rowsScrollbar}px` }"
      >
        <slot name="columns" />
      </div>
    </template>
    <SplitView
      ref="splitView"
      :items
      :selected
      virtual
      :has-more
      :loading
      :total
      :selectable
      :selection
      class="editor-split-view row-start-3 min-w-0 gap-0 rounded-none border-0 bg-transparent dark:bg-transparent"
      :class="{ compact, 'editor-open': editorOpen }"
      @select="emit('select', $event)"
      @end-reached="emit('endReached')"
      @update:selection="selection = $event.map(String)"
    >
      <template #item="{ item }">
        <slot name="item" :item="item" />
      </template>
      <template v-if="$slots.listFooter" #listFooter>
        <slot name="listFooter" />
      </template>
      <template v-if="$slots.empty" #empty>
        <slot name="empty" />
      </template>
      <template #default="{ item }">
        <slot :item="item" />
      </template>
    </SplitView>
    <slot name="context" />
  </div>
</template>

<style scoped>
/* The list and the open item take the grid's first two columns, under their headers. */
.editor-split-view {
  grid-column: 1 / span 2;
  grid-template-columns: subgrid;
}

.editor-split-view :deep(> *) {
  grid-column: span 1;
}

/* On phones only one of them shows, across the one column. */
.editor-split-view.compact {
  grid-column: 1;
  grid-template-columns: minmax(0, 1fr);
}

.editor-split-view.compact.editor-open :deep(> :first-child),
.editor-split-view.compact:not(.editor-open) :deep(> :last-child) {
  display: none;
}

.editor-split-view.compact :deep(> :first-child) {
  border-right: 0;
}

/* The list's rows and the open item's table run edge to edge. */
.editor-split-view :deep(> :first-child) {
  gap: 0;
  padding: 0;
}

.editor-split-view :deep(> :first-child li) {
  border-radius: 0;
  padding: 9px 16px;
}

.editor-split-view :deep(> :last-child > :last-child) {
  padding: 0;
}
</style>
