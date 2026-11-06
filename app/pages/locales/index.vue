<script setup lang="ts">
import { entriesLink } from "~/composables/entry/useEntryFilterQuery";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import {
  Alert,
  DataTable,
  type DataTableColumn,
  Button,
  Card,
  Badge,
  Tooltip,
  Icon,
  Pagination,
} from "@thkzt/eunoia";
import { useZipExport } from "~/composables/export/useZipExport";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

const { can } = usePermission();

// Deleted locales only reach users with permanent_delete_locale; the server drops
// the flag for everyone else.
const { data, pagination, isFetching, error, refetch } = usePaginatedList(
  api.locales.list,
  { includeDeleted: true },
);

const { t } = useI18n();
const { getErrorMessage, showSuccess, showError } = useErrorHelper();
const { exportZip, isPending: isExporting } = useZipExport();
const showImportDialog = ref(false);

// Opens the entries in this language next to the default one, whose text is the
// source to translate from. The link's filters apply to that visit only and do
// not replace the filters remembered on the entries page.
function entriesUrl(locale: Locale, status?: "missing") {
  const defaultCode = data.value?.locales?.find(
    (other) => other.isDefault && !other.deletedAt,
  )?.code;
  const codes = [defaultCode, locale.code].filter(
    (code): code is string => !!code,
  );

  return entriesLink({ locales: [...new Set(codes)], status });
}

const showExportDialog = ref(false);

async function handleExportZip(includeDrafts: boolean) {
  try {
    await exportZip([], includeDrafts);
    showExportDialog.value = false;
    showSuccess(t("export.zip.success"));
  } catch (error) {
    showError(error);
  }
}

usePage(() => ({
  width: "extra-wide",
  title: t("nav.locales"),
  description: t("locales.description"),
  showHeader: false,
  primaryAction: can.value("create_locale")
    ? {
        content: t("locales.create"),
        icon: "plus",
        onClick: () => (showDialog.value = true),
      }
    : undefined,
  secondaryActions: [
    ...(can.value("import_entry")
      ? [
          {
            content: t("import.zip.import"),
            icon: "upload",
            onClick: () => (showImportDialog.value = true),
          },
        ]
      : []),
    ...(can.value("export_entry")
      ? [
          {
            content: t("export.zip.export"),
            icon: "download",
            onClick: () => (showExportDialog.value = true),
          },
        ]
      : []),
  ],
}));

const tableColumns = computed<DataTableColumn<Locale>[]>(() => [
  {
    title: t("common.code"),
    key: "code",
    sortable: true,
  },
  {
    title: t("common.name"),
    key: "name",
    sortable: true,
  },
  {
    title: t("common.status"),
    key: "translations",
    sortable: true,
  },
  {
    title: t("common.created"),
    key: "createdAt",
    sortable: true,
  },
  {
    title: t("common.updated"),
    key: "updatedAt",
    sortable: true,
  },
]);

const localeName = useLocaleName();
// The same query the status badges read, so the column sorts by what they show.
const { data: stats } = useQuery(api.stats.get.use({}));

// The name in the UI language, so the column also sorts by it.
const tableItems = computed(() =>
  (data.value?.locales ?? []).map((locale) => ({
    ...locale,
    name: localeName(locale),
    translations:
      stats.value?.byLocale?.find((item) => item.localeId === locale.id)
        ?.percentage ?? 0,
  })),
);

const showDialog = ref(false);
const deleteDialogItem = ref<Locale | undefined>(undefined);
const restoreDialogItem = ref<Locale | undefined>(undefined);
const permanentDeleteDialogItem = ref<Locale | undefined>(undefined);
</script>

<template>
  <!-- Loading State -->
  <div
    v-if="isFetching && !data"
    class="flex items-center justify-center py-12"
  >
    <div class="text-neutral-600">{{ t("locales.loading") }}</div>
  </div>

  <!-- Error State -->
  <Alert v-else-if="error && !data" variant="danger" persistent>
    <p>{{ t("locales.loadFailed", { error: getErrorMessage(error) }) }}</p>
    <Button ghost class="mt-3" @click="() => refetch()">
      {{ t("common.tryAgain") }}
    </Button>
  </Alert>

  <!-- Locales List -->
  <div v-else-if="data">
    <Card dense>
      <DataTable
        :columns="tableColumns"
        :items="tableItems"
        :loading="isFetching && !data"
        :loading-rows="tableItems.length"
        :row-class="
          (item) =>
            item.deletedAt ? 'text-neutral-400 dark:text-neutral-400' : ''
        "
      >
        <template #name="{ item }">
          <div class="flex items-center gap-2">
            <span>{{ item.name }}</span>
            <Tooltip
              v-if="item.isDefault"
              :content="t('common.default')"
              placement="top"
              class="inline-flex"
            >
              <Badge variant="success" class="p-0.5 w-4 h-4 rounded-full">
                <Icon name="check" class="w-3 h-3" />
              </Badge>
            </Tooltip>
          </div>
        </template>
        <template #translations="{ item }">
          <div class="flex items-center gap-2">
            <LocaleTranslationCountBadge
              :item
              :entries-url="
                can('read_entry') && !item.deletedAt
                  ? (status) => entriesUrl(item, status)
                  : undefined
              "
            />
          </div>
        </template>
        <template #createdAt="{ item }">
          <RelativeTime v-if="item.createdAt" :timestamp="item.createdAt" />
        </template>
        <template #updatedAt="{ item }">
          <RelativeTime v-if="item.updatedAt" :timestamp="item.updatedAt" />
        </template>
        <template #actions="{ item }">
          <div
            v-if="!item.deletedAt"
            class="flex items-center justify-end gap-2"
          >
            <BaseIconButton
              icon="eye"
              :label="t('locales.view')"
              :to="`/locales/${item.id}`"
            />
            <BaseIconButton
              v-can="'read_entry'"
              icon="translate"
              :label="t('locales.openEntries')"
              :to="entriesUrl(item)"
            />
            <BaseIconButton
              v-can="'delete_locale'"
              icon="trash"
              destructive
              :label="t('locales.delete')"
              @click="deleteDialogItem = item"
            />
          </div>
          <div v-else class="flex items-center justify-end gap-2">
            <BaseIconButton
              v-can="'delete_locale'"
              icon="arrow-counter-clockwise"
              :label="t('locales.restore')"
              @click="restoreDialogItem = item"
            />
            <BaseIconButton
              v-can="'permanent_delete_locale'"
              icon="x-circle"
              destructive
              :label="t('locales.permanentDelete')"
              @click="permanentDeleteDialogItem = item"
            />
          </div>
        </template>

        <template #empty>
          <div class="flex flex-col items-center py-12">
            <svg
              class="h-12 w-12 text-neutral-400 dark:text-neutral-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
              />
            </svg>
            <h3
              class="mt-4 text-sm font-medium text-neutral-900 dark:text-neutral-100"
            >
              {{ t("locales.empty") }}
            </h3>
            <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {{ t("locales.emptyHint") }}
            </p>
            <Button
              v-can="'create_locale'"
              primary
              class="mt-6"
              @click="showDialog = true"
            >
              {{ t("locales.create") }}
            </Button>
          </div>
        </template>
      </DataTable>

      <Pagination
        :current="pagination.page ?? 1"
        class="mt-4"
        :per-page="pagination.perPage ?? 20"
        :total="data?.pagination?.totalPages ?? 0"
        @update:current="pagination.page = $event"
        @update:per-page="pagination.perPage = $event"
      />
    </Card>
  </div>

  <LocaleCreateDialog :open="showDialog" @close="showDialog = false" />
  <LocaleDeleteDialog
    :item="deleteDialogItem"
    :open="deleteDialogItem !== undefined"
    @close="deleteDialogItem = undefined"
  />
  <LocaleRestoreDialog
    :item="restoreDialogItem"
    :open="restoreDialogItem !== undefined"
    @close="restoreDialogItem = undefined"
  />
  <LocalePermanentDeleteDialog
    :item="permanentDeleteDialogItem"
    :open="permanentDeleteDialogItem !== undefined"
    @close="permanentDeleteDialogItem = undefined"
  />
  <LocaleExportZipDialog
    :open="showExportDialog"
    :pending="isExporting"
    @close="showExportDialog = false"
    @export="handleExportZip"
  />
  <LocaleImportZipDialog
    :open="showImportDialog"
    @close="showImportDialog = false"
  />
</template>
