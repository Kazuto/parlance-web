<script setup lang="ts">
import { Button, Dialog, Input, Textarea } from "@thkzt/eunoia";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; created: [entry: Entry] }>();
const key = ref("");
const description = ref("");
const error = ref<string>();
const entryStore = useEntryStore();
const createEntry = entryStore.create.mutateAsync;
const isPending = computed(() => entryStore.create.isPending);
const toast = useToast();
const { t } = useI18n();

watch(
  () => props.open,
  (open) => {
    if (open) {
      key.value = "";
      description.value = "";
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
  if (!key.value.trim()) {
    error.value = t("entries.keyRequired");
    return;
  }
  try {
    const response = await createEntry({
      key: key.value.trim(),
      description: description.value.trim(),
    });
    toast.add(t("entries.created", { key: key.value.trim() }), {
      variant: "success",
    });
    if (response.entry?.id) emit("created", response.entry);
    emit("close");
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : t("entries.createFailed");
  }
}
</script>

<template>
  <Dialog
    :open
    :title="t('entries.create')"
    :persistent="isPending"
    @close="handleClose"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="key"
        required
        :disabled="isPending"
        :placeholder="t('entries.keyExample')"
      >
        {{ t("common.key") }}
      </Input>
      <Textarea
        v-model="description"
        :disabled="isPending"
        :placeholder="t('entries.contextPlaceholder')"
      >
        {{ t("entries.optionalDescription") }}
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
          isPending ? t("common.creating") : t("entries.create")
        }}</Button>
      </div>
    </form>
  </Dialog>
</template>
