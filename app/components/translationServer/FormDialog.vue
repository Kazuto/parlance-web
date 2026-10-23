<script setup lang="ts">
import {
  Button,
  Checkbox,
  Dialog,
  Input,
  NumberInput,
  Switch,
} from "@thkzt/eunoia";
import type { TranslationServer } from "~/lib/api/schemas/parlance/v1/TranslationServerSchema";

// Without an item the dialog adds a server; with an item it edits it. The stored
// API key is never shown: it can only be replaced or removed.
const props = defineProps<{ open: boolean; item?: TranslationServer }>();
const emit = defineEmits<{ close: [] }>();

const form = ref({
  name: "",
  baseUrl: "",
  model: "",
  apiKey: "",
  removeApiKey: false,
  maxConcurrency: 2,
  enabled: true,
});
const store = useTranslationServerStore();
const isEdit = computed(() => !!props.item);
const { t } = useI18n();
const { showSuccess } = useErrorHelper();

const { error, isPending, submit, cancel } = useFormDialog({
  open: () => props.open,
  isPending: () => store.create.isPending || store.update.isPending,
  reset: () => {
    form.value = {
      name: props.item?.name ?? "",
      baseUrl: props.item?.baseUrl ?? "",
      model: props.item?.model ?? "",
      apiKey: "",
      removeApiKey: false,
      maxConcurrency: props.item?.maxConcurrency ?? 2,
      // The API leaves out false values, so a missing one means off; only a new
      // server starts on.
      enabled: props.item ? !!props.item.enabled : true,
    };
  },
  close: () => emit("close"),
});

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function handleSubmit() {
  submit(async () => {
    const name = form.value.name.trim();
    const baseUrl = form.value.baseUrl.trim();

    if (!name || !isHttpUrl(baseUrl)) {
      error.value = t("translationServers.nameUrlRequired");

      return false;
    }

    const input = {
      name,
      baseUrl,
      model: form.value.model.trim(),
      maxConcurrency: form.value.maxConcurrency,
      enabled: form.value.enabled,
    };

    if (props.item?.id) {
      // Only a typed key replaces the stored one; removing sends an empty key.
      const apiKey = form.value.removeApiKey
        ? ""
        : form.value.apiKey || undefined;

      await store.update.mutateAsync({ id: props.item.id, ...input, apiKey });
      showSuccess(t("translationServers.updated", { name }));
    } else {
      await store.create.mutateAsync({ ...input, apiKey: form.value.apiKey });
      showSuccess(t("translationServers.created", { name }));
    }
  });
}
</script>

<template>
  <Dialog
    :open
    :title="t(isEdit ? 'translationServers.edit' : 'translationServers.add')"
    :persistent="isPending"
    @close="cancel"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="form.name"
        required
        :disabled="isPending"
        :placeholder="t('translationServers.namePlaceholder')"
      >
        {{ t("common.name") }}
      </Input>
      <Input
        v-model="form.baseUrl"
        required
        type="url"
        :disabled="isPending"
        placeholder="http://llama:8080/v1"
        :helper="t('translationServers.baseUrlHelp')"
      >
        {{ t("translationServers.baseUrl") }}
      </Input>
      <Input
        v-model="form.model"
        :disabled="isPending"
        placeholder="tencent/Hy-MT2-7B"
        :helper="t('translationServers.modelHelp')"
      >
        {{ t("translationServers.model") }}
      </Input>
      <Input
        v-model="form.apiKey"
        type="password"
        autocomplete="off"
        :disabled="isPending || form.removeApiKey"
        :placeholder="
          item?.hasApiKey ? t('translationServers.apiKeyKept') : undefined
        "
        :helper="t('translationServers.apiKeyHelp')"
      >
        {{ t("translationServers.apiKey") }}
      </Input>
      <Checkbox
        v-if="item?.hasApiKey"
        v-model="form.removeApiKey"
        :disabled="isPending"
      >
        <template #description>
          {{ t("translationServers.removeApiKey") }}
        </template>
      </Checkbox>
      <NumberInput
        v-model="form.maxConcurrency"
        :min="1"
        :max="64"
        :disabled="isPending"
        :helper="t('translationServers.maxConcurrencyHelp')"
      >
        {{ t("translationServers.maxConcurrency") }}
      </NumberInput>
      <Switch v-model="form.enabled" :disabled="isPending">
        {{ t("translationServers.enabled") }}
      </Switch>
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
              : t(isEdit ? "common.save" : "translationServers.add")
          }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
