<script
  setup
  lang="ts"
  generic="T extends { translations: number; missingKeys: string[] }"
>
import { Badge, Tooltip } from "@thkzt/eunoia";

const props = defineProps<{
  item: T;
}>();

const store = useLocaleStore();

const { data } = storeToRefs(store);

const localeCount = computed(() => data.value?.pagination?.total ?? 0);

const variant = computed(() => {
  if (props.item.translations === localeCount.value) return "success";

  return "danger";
});
</script>

<template>
  <Tooltip
    :content="`Missing translations: ${item.missingKeys.join(', ')}`"
    :disabled="!item.missingKeys.length"
    placement="top"
  >
    <Badge :variant> {{ item.translations }} / {{ localeCount }} </Badge>
  </Tooltip>
</template>
