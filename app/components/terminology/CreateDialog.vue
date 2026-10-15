<script setup lang="ts">
import { Button, Dialog, Input, Textarea } from "@thkzt/eunoia";
import type { Terminology } from "~/lib/api/schemas/parlance/v1/TerminologySchema";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; created: [terminology: Terminology] }>();

const form = ref({
  term: "",
  description: "",
});

const error = ref<string>();
const terminologyStore = useTerminologyStore();
const createTerminology = terminologyStore.create.mutateAsync;
const isPending = computed(() => terminologyStore.create.isPending);
const toast = useToast();
const { t } = useI18n();

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.value = { term: "", description: "" };
      error.value = undefined;
    }
  },
);

function handleClose() {
  if (!isPending.value) emit("close");
}

async function handleSubmit() {
  if (isPending.value) return;
  error.value = undefined;
  if (!form.value.term.trim()) {
    error.value = t("terminologies.termRequired");
    return;
  }
  try {
    const response = await createTerminology({
      term: form.value.term.trim(),
      description: form.value.description.trim(),
    });
    toast.add(t("terminologies.created", { term: form.value.term.trim() }), {
      variant: "success",
    });
    if (response.terminology?.id) emit("created", response.terminology);
    emit("close");
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : t("terminologies.createFailed");
  }
}
</script>

<template>
  <Dialog
    :open
    :title="t('terminologies.create')"
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
          isPending ? t("common.creating") : t("terminologies.create")
        }}</Button>
      </div>
    </form>
  </Dialog>
</template>
