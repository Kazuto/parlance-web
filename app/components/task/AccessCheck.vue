<script setup lang="ts">
import { Button } from "@thkzt/eunoia";

// The button that checks an export's access, and what the check found.
defineProps<{
  result?: { ok: boolean; error?: string };
  pending?: boolean;
  disabled?: boolean;
  /** What a passed check means for this export */
  okText: string;
}>();
defineEmits<{ check: [] }>();

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <Button
      type="button"
      dense
      ghost
      :disabled="disabled || pending"
      @click="$emit('check')"
    >
      {{ pending ? t("tasks.git.checking") : t("tasks.git.check") }}
    </Button>
    <p
      v-if="result"
      role="status"
      class="text-xs"
      :class="
        result.ok
          ? 'text-green-700 dark:text-green-300'
          : 'text-red-600 dark:text-rose-300'
      "
    >
      {{
        result.ok
          ? okText
          : t("tasks.git.checkFailed", { error: result.error ?? "" })
      }}
    </p>
  </div>
</template>
