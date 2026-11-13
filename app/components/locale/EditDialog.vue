<script setup lang="ts">
import { Alert, Button, Checkbox, Dialog, Input, Select } from "@thkzt/eunoia";
import type {
  Formality,
  Locale,
} from "~/lib/api/schemas/parlance/v1/LocaleSchema";

const props = defineProps<{ open: boolean; item?: Locale }>();
const emit = defineEmits<{ close: [] }>();

const form = ref({
  code: "",
  isDefault: false,
  formality: "FORMALITY_UNSPECIFIED" as Formality,
});

const localeStore = useLocaleStore();
const { t } = useI18n();
const { showSuccess } = useErrorHelper();
const formalityOptions = useFormalityOptions();
const localeName = useLocaleName();
// The name follows the code, so a changed code shows the name it gives.
const name = computed(() => {
  const code = form.value.code.trim();
  const named = localeName({ code });

  return named !== code ? named : undefined;
});

const { error, isPending, submit, cancel } = useFormDialog({
  open: () => props.open,
  isPending: () => localeStore.update.isPending,
  reset: () => {
    form.value = {
      code: props.item?.code ?? "",
      isDefault: !!props.item?.isDefault,
      formality: formalityOf(props.item),
    };
  },
  close: () => emit("close"),
});

function handleSubmit() {
  submit(async () => {
    if (!props.item?.id) return false;

    if (!form.value.code.trim()) {
      error.value = t("locales.createRequired");

      return false;
    }

    const response = await localeStore.update.mutateAsync({
      id: props.item.id,
      code: form.value.code.trim(),
      isDefault: form.value.isDefault,
      formality: form.value.formality,
    });

    showSuccess(
      t("locales.saved", {
        code: response.locale?.code ?? form.value.code.trim(),
      }),
    );
  });
}
</script>

<template>
  <Dialog :open :title="t('locales.edit')" @close="cancel">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="form.code"
        type="text"
        required
        :disabled="isPending"
        :helper="name ? t('locales.namedAs', { name }) : t('locales.codeHelp')"
        maxlength="10"
      >
        {{ t("common.code") }}
      </Input>

      <div class="space-y-1">
        <Select
          v-model="form.formality"
          teleport-to="body"
          :options="formalityOptions"
          :disabled="isPending"
          >{{ t("locales.formality") }}</Select
        >
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t("locales.formalityHelp") }}
        </p>
      </div>

      <!-- Another language becomes the default by being set as it, so the current
           default can't be unset here. -->
      <Checkbox
        v-model="form.isDefault"
        :disabled="isPending || !!item?.isDefault"
        :helper="t('locales.defaultHelp')"
      >
        <template #description>{{ t("locales.setDefault") }}</template>
      </Checkbox>

      <Alert v-if="error" variant="danger" dense persistent>
        {{ error }}
      </Alert>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="isPending" @click="cancel">
          {{ t("common.cancel") }}
        </Button>
        <Button primary :disabled="isPending" @click="handleSubmit">
          {{ isPending ? t("common.saving") : t("common.save") }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
