<script setup lang="ts">
import { Button } from "@thkzt/eunoia";

defineProps<{
  disabled?: boolean;
}>();

defineEmits<{
  edit: [];
  delete: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex gap-2">
    <Button
      ghost
      icon="pencil-simple"
      :disabled="disabled"
      :aria-label="t('common.edit')"
      @click="$emit('edit')"
    />
    <Button
      destructive
      ghost
      icon="trash"
      :disabled="disabled"
      :aria-label="t('common.delete')"
      @click="$emit('delete')"
    />
  </div>
</template>
