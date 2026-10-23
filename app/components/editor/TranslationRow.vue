<script setup lang="ts">
import { Icon, Tooltip } from "@thkzt/eunoia";
import type { ReviewStatus } from "~/lib/api/schemas/parlance/v1/CommonSchema";

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
  /** A machine translation for this field is on its way. */
  translating?: boolean;
  /** The saved text's review state; unset while nothing is saved. */
  status?: ReviewStatus | null;
  /** Why a reviewer sent the text back. */
  reviewComment?: string | null;
  /** The user may approve the text or send it back. */
  canReview?: boolean;
}>();
const emit = defineEmits<{
  "open-context": [];
  focus: [];
  revert: [];
  approve: [];
  reject: [];
}>();

defineSlots<{
  /** Under the locale code, e.g. glossary term matches or copy-to-empty. */
  meta?: () => unknown;
}>();

const value = defineModel<string>({ default: "" });
const { t } = useI18n();

const contextLabel = computed(() =>
  t("context.openFor", { language: props.localeName }),
);

// A draft a reviewer sent back reads as such until it is approved.
const review = computed(() => {
  if (props.status === "REVIEW_STATUS_APPROVED") return "approved";
  if (props.status !== "REVIEW_STATUS_DRAFT") return undefined;

  return props.reviewComment ? "rejected" : "draft";
});

// The right edge of the field shows one thing: the revert button while there are
// unsaved edits, otherwise the review state of the saved text.
const marker = computed(() => {
  if (props.dirty) return "revert";
  if (props.translating) return undefined;

  return review.value;
});

// Leaves room for the marker, so text never runs under it.
const markerPadding = computed(() => {
  if (marker.value === "draft") return "pr-20";

  return marker.value ? "pr-10" : "";
});

// Review judges the saved text, so it waits for unsaved edits.
const reviewable = computed(
  () =>
    props.canReview &&
    review.value !== "approved" &&
    !!review.value &&
    !props.dirty &&
    !props.translating,
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
        : 'grid-cols-[150px_minmax(0,1fr)_auto] max-sm:grid-cols-[minmax(0,1fr)_auto]',
      isDefault
        ? 'bg-white shadow-sm dark:bg-neutral-800/60 dark:shadow-none'
        : '',
    ]"
  >
    <div
      class="flex min-w-0 flex-col gap-1"
      :class="{ 'max-sm:col-span-2': !withoutContext }"
    >
      <label
        :for="inputId"
        class="group inline-flex max-w-full min-w-0 cursor-pointer items-center gap-1.5 self-start"
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
        <span v-if="dirty" class="sr-only">({{ t("common.unsaved") }})</span>
      </label>
      <span
        v-if="isDefault"
        class="pl-3 text-[10.5px] font-bold text-primary-600 dark:text-primary-300"
        >{{ t("common.default") }}</span
      >
      <div v-if="$slots.meta" class="pl-3">
        <slot name="meta" />
      </div>
    </div>
    <!-- Unsaved changes mark the field itself: a yellow border and, like an input
         append, a revert button aligned with the first line. The field's 20px lines
         and 10px padding let a 20px marker at top-2.5 sit centered on that line. -->
    <div class="relative min-w-0">
      <textarea
        :id="inputId"
        v-model="value"
        :readonly="readonly || translating"
        :aria-busy="translating || undefined"
        :placeholder="translating ? undefined : placeholder"
        rows="1"
        class="block min-h-10 w-full resize-y rounded-[13px] supports-[field-sizing:content]:resize-none px-3 py-2.5 text-[13.5px] leading-5 text-neutral-900 outline-none squircle [field-sizing:content] placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-neutral-50 dark:placeholder:text-neutral-500"
        :class="[
          fieldClass,
          markerPadding,
          dirty && 'ring-1 ring-yellow-500 dark:ring-amber-300/70',
        ]"
        @focus="emit('focus')"
      />
      <!-- While a machine translation is on its way, the field shows it is being
           worked on. The sweep is left out for reduced motion. -->
      <div
        v-if="translating"
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 overflow-hidden rounded-[13px] bg-primary-50/90 squircle dark:bg-primary-950/60"
      >
        <div
          class="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/80 to-transparent motion-safe:animate-shimmer dark:via-primary-300/15"
        />
        <div
          class="relative flex h-full min-h-10 items-center gap-1.5 px-3 text-[12.5px] font-semibold text-primary-700 dark:text-primary-200"
        >
          <Icon name="sparkle" size="xs" class="motion-safe:animate-pulse" />
          {{ t("entries.translating") }}
        </div>
      </div>
      <Tooltip
        v-if="marker === 'revert'"
        :content="t('common.revert')"
        class="absolute top-2.5 right-2"
      >
        <button
          type="button"
          class="grid size-5 cursor-pointer place-items-center rounded-[100%] text-yellow-700 superellipse hover:bg-yellow-50 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-300 dark:hover:bg-amber-400/15"
          :disabled="readonly"
          :aria-label="t('common.revertFor', { language: localeName })"
          @click="emit('revert')"
        >
          <Icon name="arrow-counter-clockwise" size="xs" />
        </button>
      </Tooltip>
      <Tooltip
        v-else-if="marker"
        :content="
          marker === 'approved'
            ? t('review.approved')
            : marker === 'rejected'
              ? t('review.rejectedHint', { comment: reviewComment })
              : t('review.draftHint')
        "
        class="absolute top-2.5 right-2 flex h-5 items-center"
      >
        <span
          v-if="marker === 'draft'"
          class="block rounded-[6px] bg-neutral-100 px-1.5 py-0.5 text-[10.5px] font-bold text-neutral-500 squircle dark:bg-white/10 dark:text-neutral-300"
          >{{ t("review.draft") }}</span
        >
        <Icon
          v-else
          :name="marker === 'approved' ? 'seal-check' : 'chat-circle-text'"
          size="sm"
          :class="
            marker === 'approved'
              ? 'text-green-600 dark:text-green-300'
              : 'text-red-500 dark:text-rose-300'
          "
          :aria-label="
            marker === 'approved' ? t('review.approved') : t('review.rejected')
          "
        />
      </Tooltip>
    </div>
    <div v-if="!withoutContext" class="flex items-center gap-1">
      <template v-if="reviewable">
        <BaseIconButton
          icon="check"
          :label="t('review.approveFor', { language: localeName })"
          class="bg-white text-green-600 dark:bg-white/5 dark:text-green-300"
          @click="emit('approve')"
        />
        <BaseIconButton
          icon="arrow-u-up-left"
          :label="t('review.rejectFor', { language: localeName })"
          class="bg-white text-neutral-500 dark:bg-white/5 dark:text-neutral-400"
          @click="emit('reject')"
        />
      </template>
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
