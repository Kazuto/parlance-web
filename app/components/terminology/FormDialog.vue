<script setup lang="ts">
import {
  Button,
  Dialog,
  Input,
  Textarea,
  useTypingPlaceholder,
} from "@thkzt/eunoia";
import type { Terminology } from "~/lib/api/schemas/parlance/v1/TerminologySchema";

// Without an item the dialog creates a terminology; with an item it edits it.
const props = defineProps<{ open: boolean; item?: Terminology }>();
const emit = defineEmits<{
  close: [];
  created: [terminology: Terminology];
  updated: [terminology: Terminology];
}>();

const form = ref({
  term: "",
  description: "",
});

const terminologyStore = useTerminologyStore();
const isEdit = computed(() => !!props.item);
const { t } = useI18n();
const { showSuccess } = useErrorHelper();
const { placeholder: termPlaceholder } = useTypingPlaceholder([
  "API",
  "Dashboard",
  "UI",
  "Authentication",
  "Database",
  "Endpoint",
  "Repository",
  "Interface",
]);

const { error, isPending, submit, cancel } = useFormDialog({
  open: () => props.open,
  isPending: () =>
    terminologyStore.create.isPending || terminologyStore.update.isPending,
  reset: () => {
    form.value = {
      term: props.item?.term ?? "",
      description: props.item?.description ?? "",
    };
  },
  close: () => emit("close"),
});

function handleSubmit() {
  submit(async () => {
    const term = form.value.term.trim();

    if (!term) {
      error.value = t("terminologies.termRequired");

      return false;
    }

    const input = { term, description: form.value.description.trim() };

    if (props.item) {
      if (!props.item.id) return false;

      const response = await terminologyStore.update.mutateAsync({
        id: props.item.id,
        ...input,
      });

      showSuccess(t("terminologies.updated", { term }));
      if (response.terminology) emit("updated", response.terminology);
    } else {
      const response = await terminologyStore.create.mutateAsync(input);

      showSuccess(t("terminologies.created", { term }));
      if (response.terminology?.id) emit("created", response.terminology);
    }
  });
}
</script>

<template>
  <Dialog
    :open
    :title="t(isEdit ? 'terminologies.edit' : 'terminologies.create')"
    :persistent="isPending"
    @close="cancel"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="form.term"
        required
        :disabled="isPending"
        :placeholder="termPlaceholder"
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
              : t(isEdit ? "common.save" : "terminologies.create")
          }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
