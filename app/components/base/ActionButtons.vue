<script setup lang="ts">
defineProps<{
  disabled?: boolean;
  editLabel?: string;
  deleteLabel?: string;
  /** Each button only shows for users who hold its permission. */
  editPermission: string;
  deletePermission: string;
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
      v-can="editPermission"
      icon="pencil-simple"
      :label="editLabel ?? t('common.edit')"
      :disabled
      @click="$emit('edit')"
    />
    <BaseIconButton
      v-can="deletePermission"
      icon="trash"
      destructive
      :label="deleteLabel ?? t('common.delete')"
      :disabled
      @click="$emit('delete')"
    />
  </div>
</template>
