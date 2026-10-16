<script setup lang="ts">
import { Button, Dialog, Input, Textarea, Select } from "@thkzt/eunoia";
import type { Entry } from "~/lib/api/schemas/parlance/v1/EntrySchema";

// Without an item the dialog creates an entry; with an item it edits it.
const props = defineProps<{ open: boolean; item?: Entry }>();
const emit = defineEmits<{
  close: [];
  created: [entry: Entry];
  updated: [entry: Entry];
}>();
const key = ref("");
const description = ref("");
const scopeIds = ref<string[]>([]);
const {
  options: availableScopes,
  error: scopeError,
  isFetching: scopesLoading,
} = useScopeOptions();
// Keep the entry's own scopes selectable even if the scope list doesn't include them,
// so saving doesn't silently drop them.
const scopeOptions = computed(() => [
  ...availableScopes.value,
  ...(props.item?.scopes ?? [])
    .filter(
      (scope) =>
        scope.id &&
        !availableScopes.value.some((option) => option.value === scope.id),
    )
    .map((scope) => ({
      label: scope.name ?? scope.id ?? "",
      value: scope.id ?? "",
    })),
]);
const error = ref<string>();
const entryStore = useEntryStore();
const isEdit = computed(() => !!props.item);
const isPending = computed(
  () => entryStore.create.isPending || entryStore.update.isPending,
);
const toast = useToast();
const { t } = useI18n();

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    key.value = props.item?.key ?? "";
    description.value = props.item?.description ?? "";
    scopeIds.value = (props.item?.scopes ?? []).flatMap((scope) =>
      scope.id ? [scope.id] : [],
    );
    error.value = undefined;
  },
  { immediate: true },
);

function handleClose() {
  if (!isPending.value) emit("close");
}

async function handleSubmit() {
  if (isPending.value) return;
  error.value = undefined;
  const trimmedKey = key.value.trim();
  if (!trimmedKey) {
    error.value = t("entries.keyRequired");
    return;
  }
  try {
    if (props.item) {
      if (!props.item.id) return;
      const response = await entryStore.update.mutateAsync({
        id: props.item.id,
        key: trimmedKey,
        description: description.value.trim(),
        scopes: { ids: scopeIds.value },
      });
      toast.add(t("entries.updated", { key: trimmedKey }), {
        variant: "success",
      });
      if (response.entry?.id) emit("updated", response.entry);
    } else {
      const response = await entryStore.create.mutateAsync({
        key: trimmedKey,
        description: description.value.trim(),
        scopes: { ids: scopeIds.value },
      });
      toast.add(t("entries.created", { key: trimmedKey }), {
        variant: "success",
      });
      if (response.entry?.id) emit("created", response.entry);
    }
    emit("close");
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? cause.message
        : t(isEdit.value ? "entries.updateFailed" : "entries.createFailed");
  }
}
</script>

<template>
  <Dialog
    :open
    :title="t(isEdit ? 'entries.editTitle' : 'entries.create')"
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
      <Select
        v-model="scopeIds"
        teleport-to="body"
        multiple
        :options="scopeOptions"
        :disabled="isPending || scopesLoading"
        :placeholder="t('scopes.select')"
        >{{ t("scopes.title") }}</Select
      >
      <p v-if="scopeError" role="alert" class="text-sm text-red-600">
        {{ t("scopes.loadFailed") }}
      </p>
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
          isPending
            ? t(isEdit ? "common.saving" : "common.creating")
            : t(isEdit ? "entries.saveEntry" : "entries.create")
        }}</Button>
      </div>
    </form>
  </Dialog>
</template>
