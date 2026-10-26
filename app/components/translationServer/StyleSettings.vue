<script setup lang="ts">
import { Button, Input } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";

// The style every machine translation is asked for. The prompt puts it in square
// brackets, so the server takes one line without any; empty means its default.
const MAX_LENGTH = 200;

const { t } = useI18n();
const { can } = usePermission();
const { showError, showSuccess } = useErrorHelper();
const store = useTranslationServerStore();

const { data, isLoading } = useQuery(api.translationServers.settings.use({}));
const saved = computed(() => data.value?.settings?.style ?? "");

const style = ref("");
const error = ref("");

watch(saved, (value) => (style.value = value), { immediate: true });

const changed = computed(() => style.value.trim() !== saved.value);
const editable = computed(() => can.value("update_translation_server"));

async function save() {
  const value = style.value.trim();

  if (value.length > MAX_LENGTH || /[[\]\r\n]/.test(value)) {
    error.value = t("translationServers.styleInvalid");

    return;
  }

  error.value = "";

  try {
    await store.updateSettings.mutateAsync({ style: value });
    showSuccess(t("translationServers.styleSaved"));
  } catch (cause) {
    showError(cause);
  }
}
</script>

<template>
  <form class="space-y-3" @submit.prevent="save">
    <Input
      v-model="style"
      :disabled="isLoading || !editable || store.updateSettings.isPending"
      :placeholder="data?.settings?.defaultStyle"
      :helper="t('translationServers.styleHelp')"
    >
      {{ t("translationServers.style") }}
    </Input>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    <div v-if="editable" class="flex justify-end">
      <Button
        type="submit"
        dense
        primary
        :disabled="!changed || store.updateSettings.isPending"
      >
        {{
          store.updateSettings.isPending ? t("common.saving") : t("common.save")
        }}
      </Button>
    </div>
  </form>
</template>
