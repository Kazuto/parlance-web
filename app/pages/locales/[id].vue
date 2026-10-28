<script setup lang="ts">
import {
  ActionMenu,
  type ActionMenuItem,
  Badge,
  Button,
  Checkbox,
  Dialog,
  Input,
  Select,
  SplitView,
  type SplitViewItem,
} from "@thkzt/eunoia";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import type {
  Formality,
  Locale,
} from "~/lib/api/schemas/parlance/v1/LocaleSchema";
import { fillLanguageNames, languageName } from "~/lib/languageNames";

type LocaleForm = {
  code: string;
  names: Record<string, string>;
  isDefault: boolean;
  formality: Formality;
};

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { can } = usePermission();
// Without it the names stay readable but can't be edited.
const canUpdate = computed(() => can.value("update_locale"));
const localeName = useLocaleName();
const queryClient = useQueryClient();
const localeQueryKey = api.locales.get.getQueryKey();
const selectedId = ref(String(route.params.id));
const { items: locales, error: listError } = useAllPages(
  api.locales.list,
  (response) => response.locales,
);
const {
  data,
  isLoading,
  error: loadError,
} = useQuery(api.locales.get.use({ id: selectedId }));
const store = useLocaleStore();
const batchSaving = ref(false);
const isSaving = computed(() => batchSaving.value || store.update.isPending);
const saveAllOpen = ref(false);
const { showSuccess, showError, getErrorMessage } = useErrorHelper();
const search = ref("");
const drafts = ref<Record<string, LocaleForm>>({});
const saved = ref<Record<string, LocaleForm>>({});
const error = ref<string>();
const editOpen = ref(false);
const metadata = ref({
  code: "",
  isDefault: false,
  formality: "FORMALITY_UNSPECIFIED" as Formality,
});
const formalityOptions = useFormalityOptions();
const deleteItem = ref<Locale>();

const languages = computed(() =>
  locales.value
    .filter((locale) => locale.id && locale.code && !locale.deletedAt)
    .toSorted((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault)),
);
const items = computed<SplitViewItem[]>(() =>
  languages.value
    .filter((locale) =>
      `${localeName(locale)} ${locale.code}`
        .toLowerCase()
        .includes(search.value.toLowerCase()),
    )
    .map((locale) => ({
      key: locale.id!,
      label: `${localeName(locale)} (${locale.code})`,
    })),
);
const selectedItem = computed<SplitViewItem | undefined>(() => {
  const locale =
    locales.value.find((locale) => locale.id === selectedId.value) ??
    data.value?.locale;

  return locale
    ? {
        key: selectedId.value,
        label: `${localeName(locale)} (${locale.code})`,
      }
    : undefined;
});
const form = computed(() => drafts.value[selectedId.value]);
// Shown next to the name once set.
const formalityBadge = computed(() =>
  form.value && form.value.formality !== "FORMALITY_UNSPECIFIED"
    ? formalityOptions.value.find(
        (option) => option.value === form.value?.formality,
      )?.label
    : undefined,
);

// Languages this locale has no name for yet, from the draft if there is one.
function missingNames(id: string) {
  const names =
    drafts.value[id]?.names ??
    locales.value.find((locale) => locale.id === id)?.names;

  return languages.value.filter(
    (language) => !(names?.[language.code ?? ""] ?? "").trim(),
  ).length;
}

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
    Number(draft.isDefault !== baseline.isDefault) +
    Number(draft.formality !== baseline.formality)
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

const discardOpen = ref(false);

function discardChanges() {
  discardOpen.value = false;

  for (const id of unsavedLocaleIds.value) {
    const baseline = saved.value[id];

    if (baseline) drafts.value[id] = structuredClone(baseline);
  }
}

// Changes on the open locale go right away; others are out of sight, so confirm.
function requestDiscardAll() {
  const onlyCurrent = unsavedLocaleIds.value.every(
    (id) => id === selectedId.value,
  );

  if (onlyCurrent) discardChanges();
  else discardOpen.value = true;
}

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
      formality: formalityOf(locale),
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

// Language names are known data (CLDR, built into the browser), so filling them
// needs no translation model.
const languageCodes = computed(() =>
  languages.value.map((language) => language.code!),
);

function fillableNames(id: string) {
  const draft = drafts.value[id] ?? listForm(id);

  if (!draft) return 0;

  return languageCodes.value.filter(
    (language) =>
      !(draft.names[language] ?? "").trim() &&
      !!languageName(draft.code, language),
  ).length;
}

// A locale that wasn't opened yet has no draft; its listed data is the baseline.
function listForm(id: string): LocaleForm | undefined {
  const locale = languages.value.find((language) => language.id === id);

  if (!locale) return undefined;

  return {
    code: locale.code ?? "",
    names: { ...locale.names },
    isDefault: !!locale.isDefault,
    formality: formalityOf(locale),
  };
}

function fillNames(ids: string[]) {
  let filled = 0;

  for (const id of ids) {
    if (!drafts.value[id]) {
      const form = listForm(id);

      if (!form) continue;
      saved.value[id] ??= structuredClone(form);
      drafts.value[id] = form;
    }

    const draft = drafts.value[id]!;

    filled += fillLanguageNames(
      draft.names,
      draft.code,
      languageCodes.value,
    ).length;
  }

  if (filled) showSuccess(t("locales.namesFilled", { count: filled }));
}

const localeActions = computed<ActionMenuItem[]>(() => {
  const items: ActionMenuItem[] = [];
  const busy = isSaving.value || isLoading.value;

  if (canUpdate.value) {
    const here = fillableNames(selectedId.value);
    const everywhere = languages.value.reduce(
      (count, language) => count + fillableNames(language.id!),
      0,
    );

    items.push(
      {
        value: "fill",
        label: t("locales.fillNames"),
        icon: "translate",
        hint: here ? undefined : t("locales.noKnownMissingNames"),
        disabled: busy || !here,
      },
      {
        value: "fillAll",
        label: t("locales.fillAllNames"),
        icon: "globe-simple",
        hint: everywhere ? undefined : t("locales.noKnownMissingNames"),
        disabled: busy || !everywhere,
      },
      {
        value: "edit",
        label: t("locales.edit"),
        icon: "pencil-simple",
        disabled: busy,
      },
    );
  }

  if (can.value("delete_locale")) {
    items.push({
      value: "delete",
      label: t("locales.delete"),
      icon: "trash",
      variant: "danger",
      divider: items.length > 0,
      disabled: busy,
    });
  }

  return items;
});

function onLocaleAction(action: string) {
  if (action === "fill") fillNames([selectedId.value]);
  else if (action === "fillAll")
    fillNames(languages.value.map((language) => language.id!));
  else if (action === "edit") openEdit();
  else if (action === "delete")
    deleteItem.value = data.value?.locale ?? undefined;
}

function openEdit() {
  if (!form.value) return;
  metadata.value = {
    code: form.value.code,
    isDefault: form.value.isDefault,
    formality: form.value.formality,
  };
  editOpen.value = true;
}

function applyMetadata() {
  if (!form.value || !metadata.value.code.trim()) return;
  form.value.code = metadata.value.code.trim();
  form.value.isDefault = metadata.value.isDefault;
  form.value.formality = metadata.value.formality;
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
          formality: submitted.formality,
        });
        const locale = response.locale;

        saved.value[id] = locale
          ? {
              code: locale.code ?? submitted.code,
              names: { ...locale.names },
              isDefault: !!locale.isDefault,
              formality: formalityOf(locale),
            }
          : submitted;
        drafts.value[id] = {
          ...saved.value[id]!,
          names: { ...saved.value[id]!.names },
        };
      } catch (cause) {
        failures.push(`${submitted.code}: ${getErrorMessage(cause)}`);
      }
    }

    if (failures.length) {
      error.value = failures.join("; ");

      const message = t("locales.partialSave", {
        saved: changes.length - failures.length,
        total: changes.length,
        failures: failures.join("; "),
      });

      if (failures.length === changes.length) {
        showError(message);
      } else {
        showSuccess(message);
      }
    } else {
      showSuccess(
        changes.length === 1
          ? t("locales.saved", { code: changes[0]!.submitted.code })
          : t("locales.savedMany", { count: changes.length }),
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
        <EditorListItem
          :label="item.label"
          :missing-count="missingNames(String(item.key))"
          :unsaved="!!changedFields(String(item.key))"
          :missing-label="t('locales.missingNames')"
        />
      </template>
      <template #header>
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h2 class="flex flex-wrap items-center gap-2 font-semibold">
              {{ selectedItem?.label ?? t("locales.locale") }}
              <Badge v-if="form?.isDefault">{{ t("common.default") }}</Badge>
              <Badge v-if="formalityBadge">{{ formalityBadge }}</Badge>
            </h2>
            <p class="mt-1 text-sm text-neutral-500">
              {{ t("locales.namesHint") }}
            </p>
          </div>
          <ActionMenu
            v-if="form && localeActions.length"
            :items="localeActions"
            :label="t('locales.actions')"
            class="shrink-0 bg-neutral-100 dark:bg-white/5"
            @select="onLocaleAction"
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
          {{ getErrorMessage(loadError ?? listError) }}
        </p>
        <div
          v-else-if="form"
          class="flex w-full flex-col gap-0.5 rounded-[22px] bg-neutral-100 p-1 squircle dark:bg-neutral-950"
        >
          <EditorTranslationRow
            v-for="language in languages"
            :key="language.id ?? undefined"
            v-model="form.names[language.code ?? '']"
            :input-id="`locale-name-${selectedId}-${language.code}`"
            :locale-name="localeName(language)"
            :locale-code="language.code ?? ''"
            :is-default="!!language.isDefault"
            :translated="!!(form.names[language.code ?? ''] ?? '').trim()"
            :dirty="
              (form.names[language.code ?? ''] ?? '') !==
              (saved[selectedId]?.names[language.code ?? ''] ?? '')
            "
            :readonly="isSaving || !canUpdate"
            :placeholder="t('locales.namePlaceholder')"
            without-context
            @revert="
              form.names[language.code ?? ''] =
                saved[selectedId]?.names[language.code ?? ''] ?? ''
            "
          />
        </div>
      </template>
      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ t("common.languageCount", { count: languages.length }) }}
            <span
              v-if="currentUnsaved"
              class="ml-2 text-yellow-700 dark:text-amber-300"
              >{{ t("common.unsavedCount", { count: currentUnsaved }) }}</span
            >
            <span
              v-if="allUnsaved > currentUnsaved"
              class="ml-2 text-yellow-700 dark:text-amber-300"
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
          <EditorWorkspaceActions
            v-can="'update_locale'"
            show-save-all
            :unsaved-count="unsavedLocaleIds.length"
            :can-save="!!currentUnsaved"
            :is-saving="isSaving"
            @discard-all="requestDiscardAll"
            @save-all="saveAllOpen = true"
            @save="saveChanges"
          />
        </div>
      </template>
    </SplitView>
  </section>
  <EditorDiscardDialog
    :open="discardOpen"
    :count="allUnsaved"
    @close="discardOpen = false"
    @confirm="discardChanges"
  />
  <EditorSaveAllDialog
    :open="saveAllOpen"
    :title="t('locales.saveAllTitle')"
    :message="
      t('locales.saveAllConfirm', {
        count: allUnsaved,
        locales: unsavedLocaleIds.length,
      })
    "
    :disabled="!unsavedLocaleIds.length || isSaving"
    @close="saveAllOpen = false"
    @confirm="saveAll"
  />
  <Dialog :open="editOpen" :title="t('locales.edit')" @close="editOpen = false">
    <form class="space-y-4" @submit.prevent="applyMetadata">
      <Input v-model="metadata.code" required>{{ t("common.code") }}</Input>
      <div class="space-y-1">
        <Select v-model="metadata.formality" :options="formalityOptions">{{
          t("locales.formality")
        }}</Select>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t("locales.formalityHelp") }}
        </p>
      </div>
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
