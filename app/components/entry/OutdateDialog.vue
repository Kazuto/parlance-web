<script setup lang="ts">
import { Button, Dialog } from "@thkzt/eunoia";
import type {
  OutdateAnswer,
  SmallSourceChange,
} from "~/composables/entry/useOutdateCheck";
import { textDirection } from "~/lib/textDirection";

// Asks whether small fixes of default texts, such as typos or punctuation, mark
// their entries' translations outdated. Open while there are fixes to ask about.
const props = defineProps<{
  changes?: SmallSourceChange[];
  /** The default language's name and code. */
  language: string;
  languageCode?: string | null;
}>();

const emit = defineEmits<{ answer: [OutdateAnswer] }>();
const { t } = useI18n();

const direction = computed(() =>
  props.languageCode ? textDirection(props.languageCode) : undefined,
);
</script>

<template>
  <Dialog
    :open="!!changes?.length"
    :title="t('entries.outdateTitle')"
    @close="emit('answer', 'cancel')"
  >
    <p class="text-sm text-neutral-500 dark:text-neutral-400">
      {{
        changes?.length === 1
          ? t("entries.outdateMessage", { language })
          : t("entries.outdateMessageMany", { language })
      }}
    </p>
    <ul class="mt-4 flex max-h-72 flex-col gap-4 overflow-y-auto">
      <li
        v-for="change in changes"
        :key="change.entryId"
        class="flex flex-col gap-1.5"
      >
        <span
          v-if="changes!.length > 1"
          class="font-mono text-xs text-neutral-700 dark:text-neutral-300"
          >{{ change.key }}</span
        >
        <span
          class="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400"
          >{{ t("context.sourceBefore") }}</span
        >
        <del
          class="rounded-xl bg-neutral-100 px-2.5 py-2 text-[13px] leading-normal whitespace-pre-wrap text-neutral-600 decoration-red-400/60 squircle dark:bg-black/20 dark:text-neutral-300"
          :dir="direction"
          >{{ change.before }}</del
        >
        <span
          class="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400"
          >{{ t("context.sourceNow") }}</span
        >
        <ins
          class="rounded-xl bg-neutral-100 px-2.5 py-2 text-[13px] leading-normal whitespace-pre-wrap no-underline squircle dark:bg-black/30 dark:text-neutral-100"
          :dir="direction"
          >{{ change.after }}</ins
        >
      </li>
    </ul>
    <template #footer>
      <div class="flex flex-wrap items-center justify-end gap-3">
        <Button type="button" ghost @click="emit('answer', 'cancel')">
          {{ t("common.cancel") }}
        </Button>
        <Button type="button" @click="emit('answer', 'outdate')">
          {{ t("entries.outdateMark") }}
        </Button>
        <Button type="button" primary @click="emit('answer', 'keep')">
          {{ t("entries.outdateKeep") }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
