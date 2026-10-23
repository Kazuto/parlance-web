<script setup lang="ts">
import {
  Button,
  Dialog,
  Input,
  Textarea,
  Select,
  useTypingPlaceholder,
} from "@thkzt/eunoia";
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
const { placeholder: keyPlaceholder } = useTypingPlaceholder([
  "button.save",
  "login.title",
  "error.not_found",
  "welcome.message",
  "menu.settings",
  "form.submit",
  "user.profile",
  "nav.home",
]);
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
const entryStore = useEntryStore();
const isEdit = computed(() => !!props.item);
const { t } = useI18n();
const { showSuccess } = useErrorHelper();

const { error, isPending, submit, cancel } = useFormDialog({
  open: () => props.open,
  isPending: () => entryStore.create.isPending || entryStore.update.isPending,
  reset: () => {
    key.value = props.item?.key ?? "";
    description.value = props.item?.description ?? "";
    scopeIds.value = (props.item?.scopes ?? []).flatMap((scope) =>
      scope.id ? [scope.id] : [],
    );
  },
  close: () => emit("close"),
});

function handleSubmit() {
  submit(async () => {
    const trimmedKey = key.value.trim();

    if (!trimmedKey) {
      error.value = t("entries.keyRequired");

      return false;
    }

    if (props.item) {
      if (!props.item.id) return false;

      const response = await entryStore.update.mutateAsync({
        id: props.item.id,
        key: trimmedKey,
        description: description.value.trim(),
        scopes: { ids: scopeIds.value },
      });

      showSuccess(t("entries.updated", { key: trimmedKey }));
      if (response.entry?.id) emit("updated", response.entry);
    } else {
      const response = await entryStore.create.mutateAsync({
        key: trimmedKey,
        description: description.value.trim(),
        scopes: { ids: scopeIds.value },
      });

      showSuccess(t("entries.created", { key: trimmedKey }));
      if (response.entry?.id) emit("created", response.entry);
    }
  });
}
</script>

<template>
  <Dialog
    :open
    :title="t(isEdit ? 'entries.edit' : 'entries.create')"
    :persistent="isPending"
    @close="cancel"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="key"
        required
        :disabled="isPending"
        :placeholder="keyPlaceholder"
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
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="isPending" @click="cancel">
          {{ t("common.cancel") }}
        </Button>
        <Button primary :disabled="isPending" @click="handleSubmit">
          {{
            isPending
              ? t(isEdit ? "common.saving" : "common.creating")
              : t(isEdit ? "entries.saveEntry" : "entries.create")
          }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
