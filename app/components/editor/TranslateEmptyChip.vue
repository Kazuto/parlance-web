<script setup lang="ts">
import { Icon, Tooltip } from "@thkzt/eunoia";

// Machine-translates the default language's text into the selected languages that
// are empty. `reason` explains why it is disabled.
defineProps<{ disabled?: boolean; pending?: boolean; reason?: string }>();
const emit = defineEmits<{ click: [] }>();
const { t } = useI18n();
</script>

<template>
  <Tooltip :content="reason ?? t('entries.translateEmpty')">
    <button
      type="button"
      class="flex h-5 cursor-pointer items-center gap-1 rounded-[8px] leading-none bg-neutral-100 px-2 text-[10.5px] font-bold whitespace-nowrap text-neutral-600 squircle hover:bg-neutral-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"
      :disabled="disabled || pending"
      :aria-label="t('entries.translateEmpty')"
      :aria-busy="pending"
      @click="emit('click')"
    >
      <Icon name="translate" size="xs" />
      {{
        pending ? t("entries.translating") : t("entries.translateEmptyShort")
      }}
    </button>
  </Tooltip>
</template>
