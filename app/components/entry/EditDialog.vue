<script setup lang="ts">
import { Button, Dialog, Input, Textarea } from "@thkzt/eunoia";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";

const props = defineProps<{ open: boolean; item?: Entry }>();
const emit = defineEmits<{ close: []; updated: [entry: Entry] }>();
const key = ref("");
const description = ref("");
const error = ref<string>();
const entryStore = useEntryStore();
const isPending = computed(() => entryStore.update.isPending);
const toast = useToast();

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    key.value = props.item?.key ?? "";
    description.value = props.item?.description ?? "";
    error.value = undefined;
  },
);

function handleClose() {
  if (!isPending.value) emit("close");
}

async function handleSubmit() {
  if (!props.item?.id || isPending.value) return;
  error.value = undefined;
  if (!key.value.trim()) {
    error.value = "Entry key is required.";
    return;
  }
  try {
    const response = await entryStore.update.mutateAsync({
      id: props.item.id,
      key: key.value.trim(),
      description: description.value.trim(),
    });
    toast.add(`Entry ${key.value.trim()} updated`, { variant: "success" });
    if (response.entry?.id) emit("updated", response.entry);
    emit("close");
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : "Failed to update entry.";
  }
}
</script>

<template>
  <Dialog :open title="Edit Entry" :persistent="isPending" @close="handleClose">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="key"
        required
        :disabled="isPending"
        placeholder="e.g., button.save"
        >Key</Input
      >
      <Textarea
        v-model="description"
        :disabled="isPending"
        placeholder="Add context for translators"
        >Description (optional)</Textarea
      >
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
      <div class="flex items-center justify-end gap-3 pt-4">
        <Button type="button" ghost :disabled="isPending" @click="handleClose"
          >Cancel</Button
        >
        <Button type="submit" primary :disabled="isPending">{{
          isPending ? "Saving…" : "Save entry"
        }}</Button>
      </div>
    </form>
  </Dialog>
</template>
