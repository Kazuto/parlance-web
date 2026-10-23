<script setup lang="ts">
import { Button, Dialog, Input, Select, Switch } from "@thkzt/eunoia";
import { api } from "~/lib/api";
import type { Task, TaskType } from "~/lib/api/schemas/parlance/v1/TaskSchema";
import { formToSettings, taskToForm, type TaskForm } from "~/lib/taskForm";

// Without an item the dialog adds a task; with an item it edits it, keeping its type.
const props = defineProps<{ open: boolean; item?: Task }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const { showSuccess } = useErrorHelper();
const store = useTaskStore();
const isEdit = computed(() => !!props.item);

const form = ref<TaskForm>(taskToForm());
const token = ref("");
const removeToken = ref(false);

const localeName = useLocaleName();
const { items: locales } = useAllPages(
  api.locales.list,
  (response) => response.locales,
);
const localeOptions = computed(() =>
  locales.value
    .filter((locale) => locale.id && locale.code && !locale.deletedAt)
    .map((locale) => ({
      label: `${localeName(locale)} (${locale.code})`,
      value: locale.id ?? "",
    })),
);
const { options: scopeOptions } = useScopeOptions();

const typeOptions = computed(() =>
  (["TASK_TYPE_AI_TRANSLATE", "TASK_TYPE_GIT_EXPORT"] as const).map(
    (value) => ({ value, label: t(`tasks.type.${value}`) }),
  ),
);

const { error, isPending, submit, cancel } = useFormDialog({
  open: () => props.open,
  isPending: () => store.create.isPending || store.update.isPending,
  reset: () => {
    form.value = taskToForm(props.item);
    token.value = "";
    removeToken.value = false;
  },
  close: () => emit("close"),
});

function setType(type: TaskType) {
  form.value.type = type;
}

function handleSubmit() {
  submit(async () => {
    const settings = formToSettings(form.value);

    if (!settings.name) {
      error.value = t("tasks.nameRequired");

      return false;
    }

    if (form.value.schedule.preset === "custom" && !settings.schedule) {
      error.value = t("tasks.schedule.customRequired");

      return false;
    }

    const isGit = form.value.type === "TASK_TYPE_GIT_EXPORT";

    if (props.item?.id) {
      // Only a typed token replaces the stored one; removing sends an empty token.
      const replacement = removeToken.value ? "" : token.value || undefined;

      await store.update.mutateAsync({
        id: props.item.id,
        ...settings,
        token: isGit ? replacement : undefined,
      });
      showSuccess(t("tasks.updated", { name: settings.name }));
    } else {
      await store.create.mutateAsync({
        ...settings,
        type: form.value.type,
        token: isGit ? token.value : undefined,
      });
      showSuccess(t("tasks.created", { name: settings.name }));
    }
  });
}
</script>

<template>
  <Dialog
    :open
    :title="t(isEdit ? 'tasks.edit' : 'tasks.add')"
    :persistent="isPending"
    @close="cancel"
  >
    <form class="space-y-6" @submit.prevent="handleSubmit">
      <div class="grid gap-3 sm:grid-cols-2">
        <Input
          v-model="form.name"
          required
          :disabled="isPending"
          :placeholder="t('tasks.namePlaceholder')"
          >{{ t("common.name") }}</Input
        >
        <Select
          teleport-to="body"
          :model-value="form.type"
          :options="typeOptions"
          :disabled="isPending || isEdit"
          @update:model-value="setType($event as TaskType)"
          >{{ t("tasks.typeLabel") }}</Select
        >
      </div>

      <TaskAiTranslateFields
        v-if="form.type === 'TASK_TYPE_AI_TRANSLATE'"
        v-model="form.ai"
        :locale-options
        :scope-options
        :disabled="isPending"
      />
      <TaskGitExportFields
        v-else
        v-model="form.git"
        v-model:token="token"
        v-model:remove-token="removeToken"
        :task-id="item?.id ?? undefined"
        :has-token="!!item?.hasToken"
        :locale-options
        :scope-options
        :disabled="isPending"
      />

      <TaskTriggerFields
        v-model:schedule="form.schedule"
        v-model:on-approval="form.onApproval"
        v-model:delay="form.delay"
        :disabled="isPending"
      />

      <div class="space-y-1">
        <Switch v-model="form.enabled" :disabled="isPending">
          {{ t("tasks.enabled") }}
        </Switch>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t("tasks.enabledHelp") }}
        </p>
      </div>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="isPending" @click="cancel">
          {{ t("common.cancel") }}
        </Button>
        <Button primary :disabled="isPending" @click="handleSubmit">
          {{
            isPending
              ? t(isEdit ? "common.saving" : "common.creating")
              : t(isEdit ? "common.save" : "tasks.add")
          }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
