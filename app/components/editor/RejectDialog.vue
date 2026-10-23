<script setup lang="ts">
import { Button, Dialog, Textarea } from "@thkzt/eunoia";

// Asks a reviewer what should change before sending a translation back.
const props = defineProps<{ open: boolean; language: string }>();
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
    :title="t('review.rejectTitle', { language })"
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
      <div class="flex justify-end gap-3">
        <Button type="button" ghost @click="emit('close')">{{
          t("common.cancel")
        }}</Button>
        <Button type="submit" primary :disabled="!comment.trim()">{{
          t("review.reject")
        }}</Button>
      </div>
    </form>
  </Dialog>
</template>
