<script setup lang="ts">
import {
  DataTable,
  type DataTableColumn,
  Button,
  Card,
  Badge,
  Tooltip,
  Icon,
  Pagination,
} from "@thkzt/eunoia";
import { useLocaleList } from "~/composables/locale/useLocaleList";
import type { Locale } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

const { data, filter, pagination, isFetching, error, refetch } =
  useLocaleList();

const { can } = usePermission();

// Only show deleted locales to users with permanent_delete_locale permission
filter.value.includeDeleted = can.value("permanent_delete_locale");

const router = useRouter();
const { t } = useI18n();
const { getErrorMessage } = useErrorHelper();

usePage(() => ({
  width: "extra-wide",
  title: t("nav.locales"),
  description: t("locales.description"),
  showHeader: false,
  primaryAction: {
    content: t("locales.create"),
    icon: "plus",
    onClick: () => (showDialog.value = true),
  },
}));

const tableColumns: DataTableColumn<Locale>[] = [
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
];

const { mapTranslatable } = useTranslatable<Locale>();

const tableItems = computed(() => {
  if (!data.value?.locales) return [];

  return mapTranslatable(data.value.locales, "names");
});

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
  <div
    v-else-if="error && !data"
    class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-lg p-4"
  >
    <div class="flex items-start gap-3">
      <Icon
        name="warning-circle"
        class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
      />
      <div class="flex-1">
        <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
          {{ t("locales.loadFailed") }}
        </h3>
        <p class="mt-1 text-sm text-red-700 dark:text-red-300">
          {{ getErrorMessage(error) }}
        </p>
        <Button ghost class="mt-3" @click="() => refetch()">
          {{ t("common.tryAgain") }}
        </Button>
      </div>
    </div>
  </div>

  <!-- Locales List -->
  <div v-else-if="data">
    <Card>
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
            <TranslationCountBadge :item />
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
              @click="() => router.push(`/locales/${item.id}`)"
            />
            <BaseIconButton
              icon="trash"
              destructive
              :label="t('locales.delete')"
              @click="deleteDialogItem = item"
            />
          </div>
          <div v-else class="flex items-center justify-end gap-2">
            <BaseIconButton
              icon="arrow-counter-clockwise"
              :label="t('locales.restore')"
              @click="restoreDialogItem = item"
            />
            <BaseIconButton
              v-if="can('permanent_delete_locale')"
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
</template>
