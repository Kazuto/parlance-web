<script setup lang="ts">
import { Button, Card, Headline, Switch, Text } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import type {
  TestTranslationServerResponse,
  TranslationServer,
} from "~/lib/api/schemas/parlance/v1/TranslationServerSchema";

// The servers machine translation spreads its requests over.
const { t } = useI18n();
const { can } = usePermission();
const { showError } = useErrorHelper();
const store = useTranslationServerStore();

const { data, isLoading } = useQuery(api.translationServers.list.use({}));
const servers = computed(() => data.value?.translationServers ?? []);

const formOpen = ref(false);
const editing = ref<TranslationServer>();
const deleting = ref<TranslationServer>();

function openForm(server?: TranslationServer) {
  editing.value = server;
  formOpen.value = true;
}

async function setEnabled(server: TranslationServer, enabled: boolean) {
  if (!server.id) return;
  try {
    await store.update.mutateAsync({ id: server.id, enabled });
  } catch (error) {
    showError(error as Error);
  }
}

// The last test result per server, shown under it.
const testResults = ref<Record<string, TestTranslationServerResponse>>({});
const testing = ref<string>();

async function runTest(server: TranslationServer) {
  if (!server.id || testing.value) return;
  testing.value = server.id;
  try {
    testResults.value[server.id] = await store.test.mutateAsync({
      id: server.id,
    });
  } catch (error) {
    showError(error as Error);
  } finally {
    testing.value = undefined;
  }
}
</script>

<template>
  <Card>
    <div class="space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Headline :level="4">{{ t("translationServers.title") }}</Headline>
          <Text muted size="sm">{{ t("translationServers.description") }}</Text>
        </div>
        <Button v-can="'create_translation_server'" dense @click="openForm()">
          {{ t("translationServers.add") }}
        </Button>
      </div>

      <Text v-if="!isLoading && !servers.length" muted size="sm">
        {{ t("translationServers.empty") }}
      </Text>

      <ul v-else class="divide-y divide-neutral-200 dark:divide-neutral-800">
        <li
          v-for="server in servers"
          :key="server.id ?? ''"
          class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
        >
          <div class="flex flex-wrap items-center gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium">{{ server.name }}</span>
                <span
                  class="rounded-md px-1.5 py-0.5 text-[11px] font-bold"
                  :class="
                    server.enabled
                      ? 'bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-200'
                      : 'bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400'
                  "
                >
                  {{
                    server.enabled
                      ? t("translationServers.on")
                      : t("translationServers.off")
                  }}
                </span>
              </div>
              <div
                class="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400"
              >
                {{ server.baseUrl
                }}<template v-if="server.model"> · {{ server.model }}</template>
              </div>
              <div class="text-xs text-neutral-500 dark:text-neutral-400">
                {{
                  t("translationServers.concurrency", {
                    count: server.maxConcurrency ?? 1,
                  })
                }}
                <template v-if="server.hasApiKey">
                  · {{ t("translationServers.hasApiKey") }}
                </template>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Switch
                v-if="can('update_translation_server')"
                dense
                :model-value="!!server.enabled"
                :aria-label="
                  t('translationServers.enableFor', { name: server.name ?? '' })
                "
                :disabled="store.update.isPending"
                @update:model-value="setEnabled(server, $event)"
              />
              <Button
                v-can="'update_translation_server'"
                dense
                ghost
                :disabled="!!testing"
                @click="runTest(server)"
              >
                {{
                  testing === server.id
                    ? t("translationServers.testing")
                    : t("translationServers.test")
                }}
              </Button>
              <BaseActionButtons
                :edit-label="
                  t('translationServers.editFor', { name: server.name ?? '' })
                "
                :delete-label="
                  t('translationServers.deleteFor', { name: server.name ?? '' })
                "
                edit-permission="update_translation_server"
                delete-permission="delete_translation_server"
                @edit="openForm(server)"
                @delete="deleting = server"
              />
            </div>
          </div>
          <p
            v-if="server.id && testResults[server.id]"
            role="status"
            class="text-xs"
            :class="
              testResults[server.id]?.ok
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-600 dark:text-rose-300'
            "
          >
            {{
              testResults[server.id]?.ok
                ? t("translationServers.testOk", {
                    translation: testResults[server.id]?.translation ?? "",
                    ms: testResults[server.id]?.durationMs ?? 0,
                  })
                : t("translationServers.testFailed", {
                    error: testResults[server.id]?.error ?? "",
                  })
            }}
          </p>
        </li>
      </ul>
    </div>

    <TranslationServerFormDialog
      :open="formOpen"
      :item="editing"
      @close="formOpen = false"
    />
    <TranslationServerDeleteDialog
      :open="!!deleting"
      :item="deleting"
      @close="deleting = undefined"
    />
  </Card>
</template>
