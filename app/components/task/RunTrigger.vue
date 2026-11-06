<script setup lang="ts">
import type { TaskRun } from "~/lib/api/schemas/parlance/v1/TaskSchema";

// What started a run, with who did for runs started by hand, e.g. "Admin User · Manual".
const props = defineProps<{ run: TaskRun }>();
const { t } = useI18n();

const label = computed(() => {
  const trigger = t(`tasks.triggerType.${props.run.trigger}`);
  const user = props.run.triggeredByUser;
  const name =
    user?.name ||
    user?.email ||
    (props.run.triggeredBy ? t("context.unknownUser") : "");

  return name ? `${name} · ${trigger}` : trigger;
});
</script>

<template>
  <span>{{ label }}</span>
</template>
