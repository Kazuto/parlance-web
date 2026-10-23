<script setup lang="ts">
import { Button } from "@thkzt/eunoia";

// The save buttons under an editor: discard or save everything unsaved, or save
// what is open.
defineProps<{
  unsavedCount: number;
  canSave: boolean;
  isSaving: boolean;
  showSaveAll?: boolean;
}>();

const emit = defineEmits<{ discardAll: []; saveAll: []; save: [] }>();
const { t } = useI18n();
</script>

<template>
  <div class="flex shrink-0 items-center gap-2">
    <Button
      type="button"
      ghost
      :disabled="!unsavedCount || isSaving"
      @click="emit('discardAll')"
    >
      {{ t("common.discardAll") }}
    </Button>
    <Button
      v-if="showSaveAll"
      type="button"
      ghost
      :disabled="!unsavedCount || isSaving"
      @click="emit('saveAll')"
    >
      {{
        unsavedCount
          ? t("common.saveAllCount", { count: unsavedCount })
          : t("common.saveAll")
      }}
    </Button>
    <Button primary :disabled="!canSave || isSaving" @click="emit('save')">
      {{ isSaving ? t("common.saving") : t("common.saveChanges") }}
    </Button>
  </div>
</template>
