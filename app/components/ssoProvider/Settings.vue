<script setup lang="ts">
import { Button, Card, Headline, Switch, Text } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import type {
  SsoProvider,
  TestSsoProviderResponse,
} from "~/lib/api/schemas/parlance/v1/SsoSchema";
import { ssoRedirectUri } from "~/lib/sso";

// The OpenID Connect providers the sign-in page offers next to the password.
const { t } = useI18n();
const { can } = usePermission();
const { showError } = useErrorHelper();
const store = useSsoProviderStore();

const { data, isLoading } = useQuery(api.ssoProviders.list.use({}));
const providers = computed(() => data.value?.ssoProviders ?? []);

// For "new accounts get …" and the form's choice of role.
const { items: roles } = useAllPages(
  api.roles.list,
  (response) => response.roles,
);
const roleName = (id?: string | null) =>
  roles.value.find((role) => role.id === id)?.name;

const redirectUri = ssoRedirectUri();

const formOpen = ref(false);
const editing = ref<SsoProvider>();
const deleting = ref<SsoProvider>();

function openForm(provider?: SsoProvider) {
  editing.value = provider;
  formOpen.value = true;
}

async function setEnabled(provider: SsoProvider, enabled: boolean) {
  if (!provider.id) return;

  try {
    await store.update.mutateAsync({ id: provider.id, enabled });
  } catch (error) {
    showError(error);
  }
}

// The last test result per provider, shown under it.
const testResults = ref<Record<string, TestSsoProviderResponse>>({});
const testing = ref<string>();

async function runTest(provider: SsoProvider) {
  if (!provider.id || testing.value) return;
  testing.value = provider.id;

  try {
    testResults.value[provider.id] = await store.test.mutateAsync({
      id: provider.id,
    });
  } catch (error) {
    showError(error);
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
          <Headline :level="4">{{ t("ssoProviders.title") }}</Headline>
          <Text muted size="sm">{{ t("ssoProviders.description") }}</Text>
        </div>
        <Button v-can="'create_sso_provider'" dense @click="openForm()">
          {{ t("ssoProviders.add") }}
        </Button>
      </div>

      <div class="space-y-1">
        <div class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ t("ssoProviders.redirectUri") }}
        </div>
        <code
          class="block rounded-lg bg-neutral-100 px-2 py-1 font-mono text-xs break-all dark:bg-white/5"
          >{{ redirectUri }}</code
        >
      </div>

      <Text v-if="!isLoading && !providers.length" muted size="sm">
        {{ t("ssoProviders.empty") }}
      </Text>

      <ul v-else class="divide-y divide-neutral-200 dark:divide-neutral-800">
        <li
          v-for="provider in providers"
          :key="provider.id ?? ''"
          class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
        >
          <div class="flex flex-wrap items-center gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium">{{ provider.name }}</span>
                <span
                  class="rounded-md px-1.5 py-0.5 text-[11px] font-bold"
                  :class="
                    provider.enabled
                      ? 'bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-200'
                      : 'bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400'
                  "
                >
                  {{
                    provider.enabled
                      ? t("ssoProviders.on")
                      : t("ssoProviders.off")
                  }}
                </span>
              </div>
              <div
                class="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400"
              >
                {{ provider.issuerUrl }}
              </div>
              <div class="text-xs text-neutral-500 dark:text-neutral-400">
                {{
                  provider.defaultRoleId
                    ? t("ssoProviders.createsAccounts", {
                        role:
                          roleName(provider.defaultRoleId) ??
                          t("ssoProviders.someRole"),
                      })
                    : t("ssoProviders.existingUsersOnly")
                }}
                <template v-if="provider.hasClientSecret">
                  · {{ t("ssoProviders.hasClientSecret") }}
                </template>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Switch
                v-if="can('update_sso_provider')"
                dense
                :model-value="!!provider.enabled"
                :aria-label="
                  t('ssoProviders.enableFor', { name: provider.name ?? '' })
                "
                :disabled="store.update.isPending"
                @update:model-value="setEnabled(provider, $event)"
              />
              <Button
                v-can="'update_sso_provider'"
                dense
                ghost
                :disabled="!!testing"
                @click="runTest(provider)"
              >
                {{
                  testing === provider.id
                    ? t("ssoProviders.testing")
                    : t("ssoProviders.test")
                }}
              </Button>
              <BaseActionButtons
                :edit-label="
                  t('ssoProviders.editFor', { name: provider.name ?? '' })
                "
                :delete-label="
                  t('ssoProviders.deleteFor', { name: provider.name ?? '' })
                "
                edit-permission="update_sso_provider"
                delete-permission="delete_sso_provider"
                @edit="openForm(provider)"
                @delete="deleting = provider"
              />
            </div>
          </div>
          <p
            v-if="provider.id && testResults[provider.id]"
            role="status"
            class="text-xs break-words"
            :class="
              testResults[provider.id]?.ok
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-600 dark:text-rose-300'
            "
          >
            {{
              testResults[provider.id]?.ok
                ? t("ssoProviders.testOk")
                : t("ssoProviders.testFailed", {
                    error: testResults[provider.id]?.error ?? "",
                  })
            }}
          </p>
        </li>
      </ul>
    </div>

    <SsoProviderFormDialog
      :open="formOpen"
      :item="editing"
      :roles
      @close="formOpen = false"
    />
    <SsoProviderDeleteDialog
      :open="!!deleting"
      :item="deleting"
      @close="deleting = undefined"
    />
  </Card>
</template>
