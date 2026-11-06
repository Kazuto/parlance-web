<script setup lang="ts">
import { ActionMenu, type ActionMenuItem, Button } from "@thkzt/eunoia";

// The save buttons under an editor: discard or save everything unsaved, or save
// what is open. On phones one button shows, the others are in a menu beside it.
const props = defineProps<{
  unsavedCount: number;
  canSave: boolean;
  isSaving: boolean;
  showSaveAll?: boolean;
  compact?: boolean;
  /** On phones, whether the open item shows rather than the list. */
  editorOpen?: boolean;
}>();

const emit = defineEmits<{ discardAll: []; saveAll: []; save: [] }>();
const { t } = useI18n();

const saveAllLabel = computed(() =>
  props.unsavedCount
    ? t("common.saveAllCount", { count: props.unsavedCount })
    : t("common.saveAll"),
);
// The list has no open item to save, so there saving all is what the button does.
const savesAll = computed(
  () => props.compact && !props.editorOpen && props.showSaveAll,
);
const menuItems = computed((): ActionMenuItem[] => {
  const nothingUnsaved = !props.unsavedCount || props.isSaving;
  const items: ActionMenuItem[] = [
    {
      value: "discardAll",
      label: t("common.discardAll"),
      variant: "danger",
      disabled: nothingUnsaved,
    },
  ];

  if (props.showSaveAll && !savesAll.value)
    items.push({
      value: "saveAll",
      label: saveAllLabel.value,
      disabled: nothingUnsaved,
    });

  return items;
});

function onMenu(value: string) {
  if (value === "discardAll") emit("discardAll");
  else if (value === "saveAll") emit("saveAll");
}
</script>

<template>
  <div v-if="compact" class="flex shrink-0 items-center gap-2">
    <ActionMenu
      :items="menuItems"
      :label="t('common.moreActions')"
      @select="onMenu"
    />
    <Button
      v-if="savesAll"
      primary
      :disabled="!unsavedCount || isSaving"
      @click="emit('saveAll')"
    >
      {{ saveAllLabel }}
    </Button>
    <Button
      v-else
      primary
      :disabled="!canSave || isSaving"
      @click="emit('save')"
    >
      {{ isSaving ? t("common.saving") : t("common.saveChanges") }}
    </Button>
  </div>
  <div v-else class="flex shrink-0 items-center gap-2">
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
      {{ saveAllLabel }}
    </Button>
    <Button primary :disabled="!canSave || isSaving" @click="emit('save')">
      {{ isSaving ? t("common.saving") : t("common.saveChanges") }}
    </Button>
  </div>
</template>
