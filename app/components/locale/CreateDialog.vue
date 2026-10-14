<script setup lang="ts">
import { Button, Checkbox, Dialog, Input } from "@thkzt/eunoia";
import type { CreateLocaleResponse } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

defineProps<{
  open: boolean;
}>();

const form = ref({
  code: "",
  names: {} as Record<string, string>,
  isDefault: false,
});

const error = ref<string>();

const { create } = useLocaleStore();
const { mutateAsync: createLocale, isPending } = create;

const toast = useToast();
const { t } = useI18n();

function resetForm() {
  form.value = {
    code: "",
    names: {} as Record<string, string>,
    isDefault: false,
  };

  error.value = undefined;
}

async function handleSubmit() {
  error.value = undefined;

  if (!form.value.code || !form.value.names.en) {
    error.value = t("locales.createRequired");
    return;
  }

  await createLocale(
    {
      code: form.value.code,
      names: form.value.names,
      isDefault: form.value.isDefault,
    },
    {
      onSuccess: (response: CreateLocaleResponse) => {
        toast.add(
          t("locales.created", {
            name: response.locale?.name ?? form.value.names.en,
          }),
          {
            variant: "success",
          },
        );
      },
      onError: () => {
        toast.add(t("locales.createFailed", { name: form.value.names.en }), {
          variant: "danger",
        });
      },
    },
  );

  handleClose();
}

const emit = defineEmits<{
  close: [];
}>();

function handleClose() {
  if (!isPending) {
    emit("close");

    resetForm();
  }
}
</script>

<template>
  <Dialog :open :title="t('locales.create')" @close="handleClose">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="form.code"
        type="text"
        required
        :placeholder="t('locales.codeExample')"
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
        :placeholder="t('locales.nameExample')"
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

      <div v-if="error" class="rounded-md bg-red-50 border border-red-200 p-3">
        <p class="text-sm text-red-800">{{ error }}</p>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 pt-4">
        <Button ghost :disabled="isPending" @click="handleClose">
          {{ t("common.cancel") }}
        </Button>
        <Button primary :disabled="isPending">
          {{ isPending ? t("common.creating") : t("locales.create") }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>
