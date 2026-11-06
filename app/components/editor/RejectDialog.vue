<script setup lang="ts">
import { Button, Dialog, Textarea } from "@thkzt/eunoia";

// Asks a reviewer what should change before sending translations back.
const props = defineProps<{
  open: boolean;
  language: string;
  /** Replaces the title naming the language, e.g. for several entries. */
  title?: string;
}>();
const emit = defineEmits<{ close: []; confirm: [comment: string] }>();
const { t } = useI18n();

const comment = ref("");

watch(
  () => props.open,
  (open) => {
    if (open) comment.value = "";
  },
);

function confirm() {
  const text = comment.value.trim();

  if (text) emit("confirm", text);
}
</script>

<template>
  <Dialog
    :open
    :title="title ?? t('review.rejectFor', { language })"
    @close="emit('close')"
  >
    <form class="space-y-4" @submit.prevent="confirm">
      <Textarea
        v-model="comment"
        required
        :placeholder="t('review.commentPlaceholder')"
      >
        {{ t("review.comment") }}
      </Textarea>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost @click="emit('close')">{{
          t("common.cancel")
        }}</Button>
        <Button primary :disabled="!comment.trim()" @click="confirm">{{
          t("review.reject")
        }}</Button>
      </div>
    </template>
  </Dialog>
</template>
