<script setup lang="ts">
import {
  Button,
  Card,
  Input,
  Checkbox,
  SplitView,
  type SplitViewItem,
  Tooltip,
} from "@thkzt/eunoia";
import { useLocaleList } from "~/composables/locale/useLocaleList";
import { useLocaleGet } from "~/composables/locale/useLocaleGet";

const route = useRoute();
const router = useRouter();

const { data: localeData } = useLocaleList();

const { data, isLoading: isLoadingLocale } = useLocaleGet({
  id: route.params.id as string,
});

const localStore = useLocaleStore();

const { update } = localStore;
const { mutateAsync: updateLocale, error: errorUpdate } = update;

const error = ref<string | undefined>();

const form = ref({
  code: "",
  names: {} as Record<string, string>,
  isDefault: false,
});

const selectedLocale = ref<SplitViewItem>();

const search = ref("");

const splitViewItems = computed((): SplitViewItem[] => {
  if (!localeData.value?.locales) return [];

  return localeData.value?.locales
    .map((locale) => ({
      key: locale.code,
      label: `${locale.name}`,
    }))
    .filter((item) =>
      item.label.toLowerCase().includes(search.value.toLowerCase()),
    );
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

        <div v-if="localeData?.locales">
          <p class="text-neutral-900 mb-2">Names</p>
          <SplitView
            :items="splitViewItems"
            :selected="selectedLocale"
            searchable
            @search="search = $event"
            @select="selectedLocale = $event"
          >
            <template #item="{ item }">
              <span class="flex gap-4 w-full items-center justify-between">
                {{ item.label }}
                <Tooltip v-if="!form.names[item.key]" content="Missing">
                  <span class="w-3 h-3 rounded-full bg-red-400" />
                </Tooltip>
              </span>
            </template>

            <template #default="{ item }">
              <Input v-if="item" v-model="form.names[item.key]" />
            </template>
          </SplitView>
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
