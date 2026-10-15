<script setup lang="ts">
import { Button, Dialog, Input, Textarea } from "@thkzt/eunoia";
import type { Terminology } from "~/lib/api/schemas/parlance/v1/TerminologySchema";

const props = defineProps<{
  open: boolean;
  item?: Terminology;
}>();
const emit = defineEmits<{ close: []; updated: [terminology: Terminology] }>();

const form = ref({
  term: "",
  description: "",
});

const error = ref<string>();
const terminologyStore = useTerminologyStore();
const { mutateAsync: updateTerminology, isPending } = terminologyStore.update;
const toast = useToast();
const { t } = useI18n();

watch(
  () => props.item,
  (item) => {
    if (item) {
      form.value = {
        term: item.term ?? "",
        description: item.description ?? "",
      };
      error.value = undefined;
    }
  },
  { immediate: true },
);

function handleClose() {
  if (!isPending) emit("close");
}

async function handleSubmit() {
  if (!props.item?.id || isPending) return;
  error.value = undefined;
  if (!form.value.term.trim()) {
    error.value = t("terminologies.termRequired");
    return;
  }
  try {
    const response = await updateTerminology({
      id: props.item.id,
      term: form.value.term.trim(),
      description: form.value.description.trim(),
    });
    toast.add(t("terminologies.updated", { term: form.value.term.trim() }), {
      variant: "success",
    });
    if (response.terminology) emit("updated", response.terminology);
    emit("close");
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : t("terminologies.updateFailed");
  }
}
</script>

<template>
  <Dialog
    :open
    :title="t('terminologies.edit')"
    :persistent="isPending"
    @close="handleClose"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="form.term"
        required
        :disabled="isPending"
        :placeholder="t('terminologies.termExample')"
      >
        {{ t("terminologies.term") }}
      </Input>
      <Textarea
        v-model="form.description"
        :disabled="isPending"
        :placeholder="t('terminologies.descriptionPlaceholder')"
      >
        {{ t("common.description") }}
      </Textarea>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
      <div class="flex items-center justify-end gap-3 pt-4">
        <Button
          type="button"
          ghost
          :disabled="isPending"
          @click="handleClose"
          >{{ t("common.cancel") }}</Button
        >
        <Button type="submit" primary :disabled="isPending">{{
          isPending ? t("common.saving") : t("common.save")
        }}</Button>
      </div>
    </form>
  </Dialog>
</template>
