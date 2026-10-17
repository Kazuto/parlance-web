<script setup lang="ts">
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Input,
  SplitView,
  type SplitViewItem,
  Tooltip,
} from "@thkzt/eunoia";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { useLocaleList } from "~/composables/locale/useLocaleList";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

type LocaleForm = {
  code: string;
  names: Record<string, string>;
  isDefault: boolean;
};
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const queryClient = useQueryClient();
const localeQueryKey = api.locales.get.getQueryKey();
const selectedId = ref(String(route.params.id));
const { data: localeData, pagination, error: listError } = useLocaleList();
pagination.value.perPage = 100;
const {
  data,
  isLoading,
  error: loadError,
} = useQuery(api.locales.get.use({ id: selectedId }));
const store = useLocaleStore();
const batchSaving = ref(false);
const isSaving = computed(() => batchSaving.value || store.update.isPending);
const saveAllOpen = ref(false);
const toast = useToast();
const search = ref("");
const drafts = ref<Record<string, LocaleForm>>({});
const saved = ref<Record<string, LocaleForm>>({});
const error = ref<string>();
const editOpen = ref(false);
const metadata = ref({ code: "", isDefault: false });
const deleteItem = ref<Locale>();

const languages = computed(() =>
  (localeData.value?.locales ?? [])
    .filter((locale) => locale.id && locale.code && !locale.deletedAt)
    .toSorted((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault)),
);
const items = computed<SplitViewItem[]>(() =>
  languages.value
    .filter((locale) =>
      `${locale.name} ${locale.code}`
        .toLowerCase()
        .includes(search.value.toLowerCase()),
    )
    .map((locale) => ({
      key: locale.id!,
      label: `${locale.name ?? locale.code} (${locale.code})`,
    })),
);
const selectedItem = computed<SplitViewItem | undefined>(() => {
  const locale =
    localeData.value?.locales?.find(
      (locale) => locale.id === selectedId.value,
    ) ?? data.value?.locale;
  return locale
    ? {
        key: selectedId.value,
        label: `${locale.name ?? locale.code} (${locale.code})`,
      }
    : undefined;
});
const form = computed(() => drafts.value[selectedId.value]);

function changedFields(id: string) {
  const draft = drafts.value[id];
  const baseline = saved.value[id];
  if (!draft || !baseline) return 0;
  const codes = new Set([
    ...Object.keys(draft.names),
    ...Object.keys(baseline.names),
  ]);
  return (
    [...codes].filter(
      (code) => (draft.names[code] ?? "") !== (baseline.names[code] ?? ""),
    ).length +
    Number(draft.code !== baseline.code) +
    Number(draft.isDefault !== baseline.isDefault)
  );
}
const currentUnsaved = computed(() => changedFields(selectedId.value));
const allUnsaved = computed(() =>
  Object.keys(drafts.value).reduce((count, id) => count + changedFields(id), 0),
);
const unsavedLocaleIds = computed(() =>
  Object.keys(drafts.value).filter((id) => changedFields(id) > 0),
);
registerUnsavedChanges("locale-editor", allUnsaved, isSaving);

watch(
  () => route.params.id,
  (id) => {
    selectedId.value = String(id);
  },
);
watch(
  () => data.value?.locale,
  (locale) => {
    if (!locale?.id) return;
    const next: LocaleForm = {
      code: locale.code ?? "",
      names: { ...locale.names },
      isDefault: !!locale.isDefault,
    };
    if (!changedFields(locale.id))
      drafts.value[locale.id] = structuredClone(next);
    saved.value[locale.id] = next;
  },
  { immediate: true },
);

usePage(() => ({
  width: "extra-wide",
  layout: "workspace",
  title: t("nav.locales"),
  description: t("locales.editorDescription"),
  showHeader: false,
}));

function selectLocale(item: SplitViewItem) {
  if (isSaving.value) return;
  selectedId.value = String(item.key);
  error.value = undefined;
}

function openEdit() {
  if (!form.value) return;
  metadata.value = { code: form.value.code, isDefault: form.value.isDefault };
  editOpen.value = true;
}

function applyMetadata() {
  if (!form.value || !metadata.value.code.trim()) return;
  form.value.code = metadata.value.code.trim();
  form.value.isDefault = metadata.value.isDefault;
  editOpen.value = false;
}

async function saveChanges() {
  if (!form.value || !currentUnsaved.value || isSaving.value) return;
  await saveLocales([selectedId.value]);
}

async function saveAll() {
  if (isSaving.value) return;
  saveAllOpen.value = false;
  await saveLocales([...unsavedLocaleIds.value]);
}

async function saveLocales(ids: string[]) {
  if (!ids.length || isSaving.value) return;
  error.value = undefined;
  const changes = ids.map((id) => ({
    id,
    submitted: { ...drafts.value[id]!, names: { ...drafts.value[id]!.names } },
  }));
  const newDefaults = changes.filter(
    ({ id, submitted }) => submitted.isDefault && !saved.value[id]?.isDefault,
  );
  if (newDefaults.length > 1) {
    error.value = t("locales.singleDefault");
    return;
  }
  // Save other locales first, then apply the new default last.
  changes.sort(
    (a, b) =>
      Number(newDefaults.some((item) => item.id === a.id)) -
      Number(newDefaults.some((item) => item.id === b.id)),
  );
  const failures: string[] = [];
  batchSaving.value = true;
  try {
    for (const { id, submitted } of changes) {
      try {
        const response = await store.update.mutateAsync({
          id,
          code: submitted.code,
          isDefault: submitted.isDefault,
          names: { values: submitted.names },
        });
        const locale = response.locale;
        saved.value[id] = locale
          ? {
              code: locale.code ?? submitted.code,
              names: { ...locale.names },
              isDefault: !!locale.isDefault,
            }
          : submitted;
        drafts.value[id] = {
          ...saved.value[id]!,
          names: { ...saved.value[id]!.names },
        };
      } catch (cause) {
        failures.push(
          `${submitted.code}: ${cause instanceof Error ? cause.message : t("locales.saveFailed")}`,
        );
      }
    }
    if (failures.length) {
      error.value = failures.join("; ");
      toast.add(
        t("locales.partialSave", {
          saved: changes.length - failures.length,
          total: changes.length,
          failures: failures.join("; "),
        }),
        { variant: failures.length === changes.length ? "danger" : "warning" },
      );
    } else {
      toast.add(
        changes.length === 1
          ? t("locales.saved", { code: changes[0]!.submitted.code })
          : t("locales.savedMany", { count: changes.length }),
        { variant: "success" },
      );
    }
    await queryClient.invalidateQueries({
      queryKey: localeQueryKey,
    });
  } finally {
    batchSaving.value = false;
  }
}

async function handleDeleted(id: string) {
  Reflect.deleteProperty(drafts.value, id);
  Reflect.deleteProperty(saved.value, id);
  deleteItem.value = undefined;
  await router.push("/locales");
}
</script>

<template>
  <section class="locale-workspace" :aria-label="t('locales.workspace')">
    <SplitView
      v-model:search="search"
      :items="items"
      :selected="selectedItem"
      searchable
      search-shortcut="/"
      class="locale-split-view"
      @select="selectLocale"
    >
      <template #item="{ item }">
        <span class="flex w-full min-w-0 items-center justify-between gap-3">
          <span class="truncate" :title="item.label">{{ item.label }}</span>
          <span
            v-if="changedFields(String(item.key))"
            class="shrink-0 text-xs text-amber-700 dark:text-amber-300"
            >{{ t("common.unsaved") }}</span
          >
          <Tooltip
            v-else-if="
              languages.some(
                (language) =>
                  !(drafts[String(item.key)]?.names ??
                    localeData?.locales?.find(
                      (locale) => locale.id === item.key,
                    )?.names)?.[language.code ?? ''],
              )
            "
            :content="t('locales.missingNames')"
          >
            <span class="h-2 w-2 shrink-0 rounded-full bg-rose-400" />
          </Tooltip>
        </span>
      </template>
      <template #header>
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h2 class="flex flex-wrap items-center gap-2 font-semibold">
              {{ selectedItem?.label ?? t("locales.locale") }}
              <Badge v-if="form?.isDefault">{{ t("common.default") }}</Badge>
            </h2>
            <p class="mt-1 text-sm text-neutral-500">
              {{ t("locales.namesHint") }}
            </p>
          </div>
          <BaseActionButtons
            v-if="form"
            :key="selectedId"
            :disabled="isSaving || isLoading"
            :edit-label="t('locales.edit')"
            :delete-label="t('locales.delete')"
            @edit="openEdit"
            @delete="deleteItem = data?.locale ?? undefined"
          />
        </div>
      </template>
      <template #default>
        <p v-if="isLoading && !form" class="text-sm text-neutral-500">
          {{ t("locales.loadingOne") }}
        </p>
        <p
          v-else-if="loadError || listError"
          role="alert"
          class="text-sm text-red-600"
        >
          {{ loadError?.message ?? listError?.message }}
        </p>
        <div v-else-if="form" class="flex flex-col gap-6">
          <div
            v-for="language in languages"
            :key="language.id ?? undefined"
            :class="
              language.isDefault
                ? 'rounded-lg border border-primary-200 bg-primary-50/50 p-3 dark:border-primary-800 dark:bg-primary-950/30'
                : ''
            "
          >
            <label
              :for="`locale-name-${selectedId}-${language.code}`"
              class="mb-1 flex items-center gap-2 text-sm"
            >
              {{ language.name ?? language.code }}
              <Badge v-if="language.isDefault">{{ t("common.default") }}</Badge>
              <span
                v-if="
                  (form.names[language.code ?? ''] ?? '') !==
                  (saved[selectedId]?.names[language.code ?? ''] ?? '')
                "
                class="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                >{{ t("common.unsaved") }}</span
              >
            </label>
            <Input
              :id="`locale-name-${selectedId}-${language.code}`"
              v-model="form.names[language.code ?? '']"
              :readonly="isSaving"
              :aria-label="
                t('locales.nameIn', {
                  language: language.name ?? language.code ?? '',
                })
              "
              :placeholder="t('locales.namePlaceholder')"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="text-sm text-neutral-500">
            {{ t("common.languageCount", { count: languages.length }) }}
            <span
              v-if="currentUnsaved"
              class="ml-2 text-amber-700 dark:text-amber-300"
              >{{ t("common.unsavedCount", { count: currentUnsaved }) }}</span
            >
            <span
              v-if="allUnsaved > currentUnsaved"
              class="ml-2 text-amber-700 dark:text-amber-300"
              >{{
                t("locales.otherUnsaved", {
                  count: allUnsaved - currentUnsaved,
                })
              }}</span
            >
            <p v-if="error" role="alert" class="mt-1 text-red-600">
              {{ error }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              ghost
              :disabled="!unsavedLocaleIds.length || isSaving"
              @click="saveAllOpen = true"
            >
              {{
                unsavedLocaleIds.length
                  ? t("common.saveAllCount", { count: unsavedLocaleIds.length })
                  : t("common.saveAll")
              }}
            </Button>
            <Button
              primary
              :disabled="!currentUnsaved || isSaving"
              @click="saveChanges"
              >{{
                isSaving ? t("common.saving") : t("common.saveChanges")
              }}</Button
            >
          </div>
        </div>
      </template>
    </SplitView>
  </section>
  <Dialog
    :open="saveAllOpen"
    :title="t('locales.saveAllTitle')"
    @close="saveAllOpen = false"
  >
    <p class="text-sm text-neutral-500">
      {{
        t("locales.saveAllConfirm", {
          count: allUnsaved,
          locales: unsavedLocaleIds.length,
        })
      }}
    </p>
    <div class="mt-6 flex justify-end gap-3">
      <Button type="button" ghost @click="saveAllOpen = false">{{
        t("common.cancel")
      }}</Button>
      <Button
        type="button"
        primary
        :disabled="!unsavedLocaleIds.length || isSaving"
        @click="saveAll"
        >{{ t("common.saveAll") }}</Button
      >
    </div>
  </Dialog>
  <Dialog :open="editOpen" :title="t('locales.edit')" @close="editOpen = false">
    <form class="space-y-4" @submit.prevent="applyMetadata">
      <Input v-model="metadata.code" required>{{ t("common.code") }}</Input>
      <Checkbox v-model="metadata.isDefault" :helper="t('locales.defaultHelp')">
        <template #description>{{ t("locales.setDefault") }}</template>
      </Checkbox>
      <p class="text-sm text-neutral-500">
        {{ t("locales.draftHint") }}
      </p>
      <div class="flex justify-end gap-3">
        <Button type="button" ghost @click="editOpen = false">{{
          t("common.cancel")
        }}</Button>
        <Button type="submit" primary :disabled="!metadata.code.trim()">{{
          t("common.applyChanges")
        }}</Button>
      </div>
    </form>
  </Dialog>
  <LocaleDeleteDialog
    :open="!!deleteItem"
    :item="deleteItem"
    @close="deleteItem = undefined"
    @deleted="handleDeleted"
  />
</template>

<style scoped>
.locale-workspace {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
.locale-split-view {
  width: 100%;
  grid-template-columns: minmax(220px, 290px) minmax(0, 1fr);
  gap: 0;
}
.locale-split-view :deep(> *) {
  grid-column: span 1;
}
@media (max-width: 640px) {
  .locale-split-view {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: 150px minmax(0, 1fr);
  }
}
</style>
