<script setup lang="ts">
import { Button, Dialog, Input } from "@thkzt/eunoia";
import type { Scope, Tag } from "~/lib/api/schemas/parlance/v1/ScopeSchema";

// Adds, renames and deletes the tags of one scope.
const props = defineProps<{ open: boolean; scope?: Scope }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const { showSuccess, showError, getErrorMessage } = useErrorHelper();
const scopeStore = useScopeStore();

const newName = ref("");
const addError = ref<string>();
const editingId = ref<string>();
const editName = ref("");
const deletingId = ref<string>();

const tags = computed(() => props.scope?.tags ?? []);
const isPending = computed(
  () =>
    scopeStore.createTag.isPending ||
    scopeStore.updateTag.isPending ||
    scopeStore.destroyTag.isPending,
);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    newName.value = "";
    addError.value = undefined;
    editingId.value = undefined;
    deletingId.value = undefined;
  },
  { immediate: true },
);

async function addTag() {
  const name = newName.value.trim();

  if (!props.scope?.id || isPending.value) return;

  if (!name) {
    addError.value = t("tags.nameRequired");

    return;
  }

  addError.value = undefined;

  try {
    await scopeStore.createTag.mutateAsync({ scopeId: props.scope.id, name });
  } catch (error) {
    addError.value = getErrorMessage(error);

    return;
  }

  newName.value = "";
  showSuccess(t("tags.created", { name }));
}

function startRename(tag: Tag) {
  deletingId.value = undefined;
  editingId.value = tag.id ?? undefined;
  editName.value = tag.name ?? "";
}

async function rename(tag: Tag) {
  const name = editName.value.trim();

  if (!tag.id || isPending.value) return;

  if (!name || name === tag.name) {
    editingId.value = undefined;

    return;
  }

  try {
    await scopeStore.updateTag.mutateAsync({ id: tag.id, name });
  } catch (error) {
    showError(error);

    return;
  }

  editingId.value = undefined;
  showSuccess(t("tags.renamed", { name }));
}

async function destroy(tag: Tag) {
  if (!tag.id || isPending.value) return;

  try {
    await scopeStore.destroyTag.mutateAsync({ id: tag.id });
  } catch (error) {
    showError(error);

    return;
  }

  deletingId.value = undefined;
  showSuccess(t("tags.deleted", { name: tag.name ?? "" }));
}

function close() {
  if (!isPending.value) emit("close");
}
</script>

<template>
  <Dialog
    :open
    :title="t('tags.dialogTitle', { scope: scope?.name ?? '' })"
    :persistent="isPending"
    @close="close"
  >
    <div class="space-y-4">
      <p class="text-sm text-neutral-500 dark:text-neutral-400">
        {{ t("tags.description") }}
      </p>

      <form
        v-can="'create_tag'"
        class="flex items-end gap-2"
        @submit.prevent="addTag"
      >
        <div class="min-w-0 flex-1">
          <Input
            v-model="newName"
            :disabled="isPending"
            :placeholder="t('tags.namePlaceholder')"
            :invalid="!!addError"
            :errors="addError ? [addError] : undefined"
            maxlength="100"
          >
            {{ t("tags.newTag") }}
          </Input>
        </div>
        <Button type="submit" icon="plus" :disabled="isPending">
          {{ t("tags.add") }}
        </Button>
      </form>

      <ul
        v-if="tags.length"
        class="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700"
        :aria-label="t('tags.title')"
      >
        <li
          v-for="tag in tags"
          :key="tag.id ?? undefined"
          class="flex min-h-12 items-center gap-3 px-3 py-2"
        >
          <form
            v-if="editingId === tag.id"
            class="flex min-w-0 flex-1 items-center gap-2"
            @submit.prevent="rename(tag)"
          >
            <div class="min-w-0 flex-1">
              <Input
                v-model="editName"
                dense
                :disabled="isPending"
                :aria-label="t('tags.renameLabel', { name: tag.name ?? '' })"
                maxlength="100"
                @keydown.esc.stop.prevent="editingId = undefined"
              />
            </div>
            <Button type="submit" dense primary :disabled="isPending">
              {{ t("common.save") }}
            </Button>
            <Button
              type="button"
              dense
              ghost
              :disabled="isPending"
              @click="editingId = undefined"
            >
              {{ t("common.cancel") }}
            </Button>
          </form>

          <template v-else-if="deletingId === tag.id">
            <p role="alert" class="min-w-0 flex-1 text-sm">
              {{
                t(
                  "tags.deleteConfirm",
                  { name: tag.name ?? "", count: tag.entryCount ?? 0 },
                  tag.entryCount ?? 0,
                )
              }}
            </p>
            <Button
              type="button"
              dense
              ghost
              :disabled="isPending"
              @click="deletingId = undefined"
            >
              {{ t("common.cancel") }}
            </Button>
            <Button
              type="button"
              dense
              destructive
              :disabled="isPending"
              @click="destroy(tag)"
            >
              {{ t("common.delete") }}
            </Button>
          </template>

          <template v-else>
            <ScopeTagChip dense class="min-w-0">{{ tag.name }}</ScopeTagChip>
            <span
              class="flex-1 text-xs whitespace-nowrap text-neutral-500 dark:text-neutral-400"
              >{{
                t(
                  "tags.entryCount",
                  { count: tag.entryCount ?? 0 },
                  tag.entryCount ?? 0,
                )
              }}</span
            >
            <BaseActionButtons
              :disabled="isPending"
              :edit-label="t('tags.renameLabel', { name: tag.name ?? '' })"
              :delete-label="t('tags.deleteLabel', { name: tag.name ?? '' })"
              edit-permission="update_tag"
              delete-permission="delete_tag"
              @edit="startRename(tag)"
              @delete="
                editingId = undefined;
                deletingId = tag.id ?? undefined;
              "
            />
          </template>
        </li>
      </ul>
      <p
        v-else
        class="rounded-md border border-dashed border-neutral-300 px-3 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
      >
        {{ t("tags.empty") }}
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <Button type="button" ghost :disabled="isPending" @click="close">
          {{ t("common.close") }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
