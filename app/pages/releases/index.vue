<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import {
  Alert,
  Button,
  Card,
  Chip,
  DataTable,
  Pagination,
  type DataTableColumn,
} from "@thkzt/eunoia";
import { api } from "~/lib/api";
import type { PaginationRequest } from "~/lib/api/schemas/parlance/v1/CommonSchema";
import type { Release } from "~/lib/api/schemas/parlance/v1/ReleaseSchema";
import { entriesLink } from "~/composables/entry/useEntryFilterQuery";

const { t } = useI18n();
const { getErrorMessage } = useErrorHelper();
const { can } = usePermission();
const releaseDate = useReleaseDate();

// Pending releases first, by date with unscheduled ones last, then those that went
// out, the latest first: the server's order.
const pagination = ref<PaginationRequest>({ page: 1, perPage: 20 });
const { data, isFetching, error, refetch } = useQuery(
  api.releases.list.use({ pagination }),
);

const createDialogOpen = ref(false);
const editDialogItem = ref<Release>();
const deleteDialogItem = ref<Release>();
const publishDialogItem = ref<Release>();

usePage(() => ({
  width: "extra-wide",
  title: t("nav.releases"),
  description: t("releases.description"),
  showHeader: false,
  primaryAction: can.value("create_release")
    ? {
        content: t("releases.create"),
        icon: "plus",
        onClick: () => (createDialogOpen.value = true),
      }
    : undefined,
}));

const tableColumns = computed<DataTableColumn<Release>[]>(() => [
  { title: t("common.name"), key: "name" },
  { title: t("releases.date"), key: "releaseAt" },
  { title: t("releases.state"), key: "state" },
  { title: t("releases.entries"), key: "entryCount" },
]);
const tableItems = computed(() => data.value?.releases ?? []);

// What goes out with each pending release, from the command palette.
useCommands(() =>
  tableItems.value
    .filter((release) => release.id && !release.releasedAt)
    .map((release) => ({
      label: t("commands.showReleaseEntries", { release: release.name ?? "" }),
      value: `release:${release.id}`,
      group: t("nav.releases"),
      icon: "list-magnifying-glass",
      run: () => navigateTo(entriesLink({ releases: [release.id ?? ""] })),
    })),
);
</script>

<template>
  <div
    v-if="isFetching && !data"
    class="flex items-center justify-center py-12"
  >
    <div class="text-neutral-600">{{ t("releases.loading") }}</div>
  </div>

  <Alert v-else-if="error && !data" variant="danger" persistent>
    <p>{{ t("releases.listFailed", { error: getErrorMessage(error) }) }}</p>
    <Button ghost @click="() => refetch()">{{ t("common.tryAgain") }}</Button>
  </Alert>

  <Card v-else-if="data" dense>
    <DataTable
      v-if="tableItems.length"
      :columns="tableColumns"
      :items="tableItems"
      :row-class="
        (item) =>
          item.releasedAt ? 'text-neutral-500 dark:text-neutral-400' : ''
      "
    >
      <template #name="{ item }">
        <div class="min-w-0">
          <div class="font-medium">{{ item.name }}</div>
          <div
            v-if="item.description"
            class="line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400"
          >
            {{ item.description }}
          </div>
        </div>
      </template>
      <template #releaseAt="{ item }">
        <span class="whitespace-nowrap">{{ releaseDate(item) }}</span>
      </template>
      <template #state="{ item }">
        <Chip
          dense
          :variant="item.releasedAt ? 'secondary' : 'primary'"
          :title="
            item.releasedAt
              ? releaseDate({ releaseAt: item.releasedAt })
              : undefined
          "
        >
          {{ t(item.releasedAt ? "releases.released" : "releases.pending") }}
        </Chip>
      </template>
      <template #entryCount="{ item }">
        {{ item.entryCount ?? 0 }}
      </template>
      <template #actions="{ item }">
        <div class="flex justify-end gap-2">
          <BaseIconButton
            icon="list-magnifying-glass"
            :label="t('releases.showEntries')"
            :to="entriesLink({ releases: [item.id ?? ''] })"
          />
          <BaseIconButton
            v-if="!item.releasedAt"
            v-can="'update_release'"
            icon="rocket-launch"
            :label="t('releases.publish')"
            @click="publishDialogItem = item"
          />
          <BaseActionButtons
            :edit-label="t('releases.edit')"
            :delete-label="t('releases.delete')"
            edit-permission="update_release"
            delete-permission="delete_release"
            @edit="editDialogItem = item"
            @delete="deleteDialogItem = item"
          />
        </div>
      </template>
    </DataTable>
    <div v-else class="py-12 text-center">
      <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {{ t("releases.empty") }}
      </p>
      <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        {{ t("releases.emptyHint") }}
      </p>
    </div>

    <Pagination
      v-if="(data.pagination?.totalPages ?? 0) > 1"
      class="mt-4"
      :current="pagination.page ?? 1"
      :per-page="pagination.perPage ?? 20"
      :total="data.pagination?.totalPages ?? 0"
      @update:current="pagination.page = $event"
      @update:per-page="pagination.perPage = $event"
    />
  </Card>

  <ReleaseFormDialog
    :open="createDialogOpen"
    @close="createDialogOpen = false"
  />
  <ReleaseFormDialog
    :open="!!editDialogItem"
    :item="editDialogItem"
    @close="editDialogItem = undefined"
  />
  <ReleaseDeleteDialog
    :open="!!deleteDialogItem"
    :item="deleteDialogItem"
    @close="deleteDialogItem = undefined"
  />
  <ReleasePublishDialog
    :open="!!publishDialogItem"
    :item="publishDialogItem"
    @close="publishDialogItem = undefined"
  />
</template>
