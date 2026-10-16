<script setup lang="ts">
defineProps<{
  disabled?: boolean;
  editLabel?: string;
  deleteLabel?: string;
}>();

defineEmits<{
  edit: [];
  delete: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex gap-2">
    <BaseIconButton
      icon="pencil-simple"
      :label="editLabel ?? t('common.edit')"
      :disabled
      @click="$emit('edit')"
    />
    <BaseIconButton
      icon="trash"
      destructive
      :label="deleteLabel ?? t('common.delete')"
      :disabled
      @click="$emit('delete')"
    />
  </div>
</template>
