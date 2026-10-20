<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";

const props = defineProps<{
  terminologyId: string;
  localeId: string;
  localeName: string;
}>();
const emit = defineEmits<{ close: [] }>();

const page = ref(1);
const terminologyId = computed(() => props.terminologyId);
const options = api.terminologies.history.use({
  terminologyId,
  pagination: { page, perPage: 25 },
});
const { data, isFetching, error, refetch } = useQuery({
  ...options,
  enabled: computed(() => toValue(options.enabled) && !!terminologyId.value),
  staleTime: 10000,
});
watch(terminologyId, () => {
  page.value = 1;
});
const history = computed(() =>
  (data.value?.history ?? []).filter(
    (item) => item.localeId === props.localeId,
  ),
);
</script>

<template>
  <BaseContextPanel :locale-name="localeName" @close="emit('close')">
    <EditorHistoryList
      v-model:page="page"
      :items="history"
      :loading="isFetching && !data"
      :failed="!!error && !data"
      :total-pages="data?.pagination?.totalPages ?? 0"
      @retry="refetch()"
    />
  </BaseContextPanel>
</template>
