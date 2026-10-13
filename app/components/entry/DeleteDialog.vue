<script setup lang="ts">
import { Button, Dialog } from "@thkzt/eunoia";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";

const props = defineProps<{ open: boolean; item?: Entry }>();
const emit = defineEmits<{ close: []; deleted: [id: string] }>();
const entryStore = useEntryStore();
const deleteEntry = entryStore.destroy.mutateAsync;
const isPending = computed(() => entryStore.destroy.isPending);
const error = ref<string>();
const toast = useToast();
watch(
  () => props.open,
  () => {
    error.value = undefined;
  },
);

function handleClose() {
  if (!isPending.value) emit("close");
}

async function handleSubmit() {
  const entry = props.item;
  if (!entry?.id || isPending.value) return;
  error.value = undefined;
  try {
    await deleteEntry({ id: entry.id });
    toast.add(`Entry ${entry.key} deleted`, { variant: "success" });
    emit("deleted", entry.id);
    emit("close");
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : "Failed to delete entry.";
  }
}
</script>

<template>
  <Dialog
    :open
    :title="`Delete Entry: ${item?.key ?? ''}`"
    :persistent="isPending"
    @close="handleClose"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <p class="text-sm text-neutral-500">
        Are you sure you want to delete this entry? It will be removed from the
        active entry list.
      </p>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
      <div class="flex items-center justify-end gap-3 pt-4">
        <Button type="button" ghost :disabled="isPending" @click="handleClose"
          >Cancel</Button
        >
        <Button type="submit" destructive :disabled="isPending">{{
          isPending ? "Deleting…" : "Delete Entry"
        }}</Button>
      </div>
    </form>
  </Dialog>
</template>
