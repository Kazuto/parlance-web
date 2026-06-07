<script setup lang="ts">
import { Button, Card, Input, Checkbox } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";

const route = useRoute();
const router = useRouter();

const localStore = useLocaleStore();

const { data: localeData } = storeToRefs(localStore);

const localeGetEndpoint = api.locale.get.use(
  computed(() => ({ id: route.params.id as string })),
);

const { data, isLoading: isLoadingLocale } = useQuery({
  ...localeGetEndpoint,
});

const { update } = localStore;
const { mutateAsync: updateLocale, error: errorUpdate } = update;

const error = ref<string | undefined>();

const form = ref({
  code: "",
  names: {} as Record<string, string>,
  isDefault: false,
});

watch(
  data,
  (newData) => {
    if (!newData?.locale) return;
    form.value = {
      code: newData.locale.code,
      names: { ...newData.locale.names },
      isDefault: newData.locale.isDefault ?? false,
    };
  },
  { immediate: true },
);

async function handleUpdate() {
  error.value = undefined;

  const locale = data.value?.locale;

  if (!locale) {
    error.value = "Locale not found";
    return;
  }

  await updateLocale({
    id: locale.id,
    code: form.value.code,
    names: form.value.names,
    isDefault: form.value.isDefault,
  });
}
</script>

<template>
  <div v-if="isLoadingLocale">Loading...</div>
  <div v-else-if="errorUpdate">Error: {{ errorUpdate.message }}</div>

  <template v-else-if="data?.locale">
    <div class="flex items-center gap-2">
      <Button ghost icon="arrow-left" @click="router.back()" />

      <h2 class="text-2xl font-bold text-neutral-900">
        Locale: {{ data.locale.name }} ({{ data.locale.code }})
      </h2>
    </div>

    <Card>
      <div class="space-y-4">
        <Input v-model="form.code"> Code </Input>

        <div v-if="localeData?.locales" class="text-sm text-neutral-600">
          <p class="font-bold text-base">Names</p>
          <div class="space-y-2">
            <Input
              v-for="locale in localeData.locales"
              :key="locale.id"
              v-model="form.names[locale.code]"
            >
              {{ locale.code }}
            </Input>
          </div>
        </div>

        <Checkbox
          v-model="form.isDefault"
          helper="This will be the fallback locale for translations"
        >
          <template #description> Set as default locale </template>
        </Checkbox>

        <div class="flex items-center justify-end gap-2">
          <Button primary @click="handleUpdate"> Update Locale </Button>
        </div>
      </div>
    </Card>
  </template>
</template>
