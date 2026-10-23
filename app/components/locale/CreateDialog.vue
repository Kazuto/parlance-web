<script setup lang="ts">
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  Input,
  useTypingPlaceholder,
} from "@thkzt/eunoia";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const form = ref({
  code: "",
  names: {} as Record<string, string>,
  isDefault: false,
});

const localeStore = useLocaleStore();
const { t } = useI18n();
const { showSuccess } = useErrorHelper();

const { placeholder: codePlaceholder } = useTypingPlaceholder([
  "en-US",
  "de-DE",
  "fr-FR",
  "es-ES",
  "ja-JP",
  "zh-CN",
  "pt-PT",
  "it-IT",
  "nl-NL",
  "pl-PL",
  "ru-RU",
]);
const { placeholder: namePlaceholder } = useTypingPlaceholder([
  "English",
  "German",
  "French",
  "Spanish",
  "Japanese",
  "Chinese",
  "Portuguese",
  "Italian",
  "Dutch",
  "Polish",
  "Russian",
]);

const { error, isPending, submit, cancel } = useFormDialog({
  open: () => props.open,
  isPending: () => localeStore.create.isPending,
  reset: () => {
    form.value = { code: "", names: {}, isDefault: false };
  },
  close: () => emit("close"),
});

function handleSubmit() {
  submit(async () => {
    if (!form.value.code || !form.value.names.en) {
      error.value = t("locales.createRequired");

      return false;
    }

    const response = await localeStore.create.mutateAsync({
      code: form.value.code,
      names: { values: form.value.names },
      isDefault: form.value.isDefault,
    });

    showSuccess(
      t("locales.created", {
        name: response.locale?.name ?? form.value.names.en,
      }),
    );
  });
}
</script>

<template>
  <Dialog :open :title="t('locales.create')" @close="cancel">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="form.code"
        type="text"
        required
        :placeholder="codePlaceholder"
        :disabled="isPending"
        :helper="t('locales.codeHelp')"
        maxlength="10"
      >
        {{ t("common.code") }}
      </Input>

      <Input
        v-model="form.names.en"
        type="text"
        required
        :placeholder="namePlaceholder"
        :helper="t('locales.nameHelp')"
        :disabled="isPending"
      >
        {{ t("locales.englishName") }}
      </Input>

      <Checkbox
        v-model="form.isDefault"
        :disabled="isPending"
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
          {{ isPending ? t("common.creating") : t("locales.create") }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
