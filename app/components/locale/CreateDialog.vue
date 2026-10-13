<script setup lang="ts">
import { Button, Checkbox, Dialog, Input } from "@thkzt/eunoia";
import type { CreateLocaleResponse } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

defineProps<{
  open: boolean;
}>();

const code = ref("");
const nameEn = ref("");
const isDefault = ref(false);
const error = ref<string>();

const { create } = useLocaleStore();
const { mutateAsync: createLocale, isPending } = create;

const toast = useToast();
const { t } = useI18n();

function resetForm() {
  code.value = "";
  nameEn.value = "";
  isDefault.value = false;
  error.value = undefined;
}

async function handleSubmit() {
  error.value = undefined;

  if (!code.value || !nameEn.value) {
    error.value = t("locales.createRequired");
    return;
  }

  await createLocale(
    {
      code: code.value,
      names: {
        en: nameEn.value,
      },
      isDefault: isDefault.value,
    },
    {
      onSuccess: (response: CreateLocaleResponse) => {
        toast.add(
          t("locales.created", { name: response.locale?.name ?? nameEn.value }),
          {
            variant: "success",
          },
        );
      },
      onError: () => {
        toast.add(t("locales.createFailed", { name: nameEn.value }), {
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
      <!-- Code -->
      <div>
        <Input
          v-model="code"
          type="text"
          required
          :placeholder="t('locales.codeExample')"
          :disabled="isPending"
          :helper="t('locales.codeHelp')"
        >
          {{ t("common.code") }}
        </Input>
      </div>

      <!-- Name (English) -->
      <div>
        <Input
          v-model="nameEn"
          type="text"
          required
          :placeholder="t('locales.nameExample')"
          :helper="t('locales.nameHelp')"
          :disabled="isPending"
        >
          {{ t("locales.englishName") }}
        </Input>
      </div>

      <!-- Is Default -->
      <Checkbox
        v-model="isDefault"
        :disabled="isPending"
        :helper="t('locales.defaultHelp')"
      >
        <template #description>{{ t("locales.setDefault") }}</template>
      </Checkbox>

      <!-- Error -->
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
