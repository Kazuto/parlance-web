<script setup lang="ts">
import { Button, Card, ConfirmDialog, Headline, Text } from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import type { ApiToken } from "~/lib/api/schemas/parlance/v1/AccountSchema";

// Tokens let scripts use the API as the signed-in user. Their secrets are only
// shown when created, so the list tells them apart by name and start.
const { t } = useI18n();
const store = useAccountStore();

const { data, isLoading } = useQuery(api.account.apiTokens.use({}));
const tokens = computed(() => data.value?.tokens ?? []);

const expired = (token: ApiToken) =>
  !!token.expiresAt && Date.parse(token.expiresAt) <= Date.now();

const creating = ref(false);
const revoking = ref<ApiToken>();

const {
  isPending: isRevoking,
  run,
  cancel: cancelRevoke,
} = useConfirmMutation(
  () => store.deleteApiToken,
  () => (revoking.value = undefined),
);

function revoke() {
  if (!revoking.value?.id) return;
  run(
    { id: revoking.value.id },
    t("apiTokens.revoked", { name: revoking.value.name ?? "" }),
  );
}
</script>

<template>
  <Card>
    <div class="space-y-4">
      <div class="flex items-start gap-3">
        <div class="min-w-0 flex-1">
          <Headline :level="4">{{ t("apiTokens.title") }}</Headline>
          <Text muted size="sm">{{ t("apiTokens.description") }}</Text>
        </div>
        <Button dense class="shrink-0" @click="creating = true">
          {{ t("apiTokens.create") }}
        </Button>
      </div>

      <Text v-if="!isLoading && !tokens.length" muted size="sm">
        {{ t("apiTokens.empty") }}
      </Text>

      <ul v-else class="divide-y divide-neutral-200 dark:divide-neutral-800">
        <li
          v-for="token in tokens"
          :key="token.id ?? ''"
          class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div class="min-w-0 flex-1 space-y-0.5">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium break-all">{{ token.name }}</span>
              <code
                class="font-mono text-xs text-neutral-500 dark:text-neutral-400"
                >{{ token.prefix }}…</code
              >
              <span
                v-if="expired(token)"
                class="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] font-bold text-neutral-500 dark:bg-white/5 dark:text-neutral-400"
              >
                {{ t("apiTokens.expired") }}
              </span>
            </div>
            <div
              class="flex flex-wrap gap-x-3 text-xs text-neutral-500 dark:text-neutral-400"
            >
              <i18n-t
                v-if="token.createdAt"
                keypath="apiTokens.createdAt"
                tag="span"
                scope="global"
              >
                <template #time>
                  <RelativeTime :timestamp="token.createdAt" />
                </template>
              </i18n-t>
              <i18n-t
                v-if="token.lastUsedAt"
                keypath="apiTokens.lastUsedAt"
                tag="span"
                scope="global"
              >
                <template #time>
                  <RelativeTime :timestamp="token.lastUsedAt" />
                </template>
              </i18n-t>
              <span v-else>{{ t("apiTokens.neverUsed") }}</span>
              <i18n-t
                v-if="token.expiresAt && !expired(token)"
                keypath="apiTokens.expiresAt"
                tag="span"
                scope="global"
              >
                <template #time>
                  <RelativeTime :timestamp="token.expiresAt" />
                </template>
              </i18n-t>
              <span v-else-if="!token.expiresAt">{{
                t("apiTokens.neverExpires")
              }}</span>
            </div>
          </div>
          <BaseIconButton
            icon="trash"
            destructive
            :label="t('apiTokens.revokeFor', { name: token.name ?? '' })"
            @click="revoking = token"
          />
        </li>
      </ul>
    </div>

    <AccountApiTokenDialog :open="creating" @close="creating = false" />
    <ConfirmDialog
      :open="!!revoking"
      :title="t('apiTokens.revokeTitle', { name: revoking?.name ?? '' })"
      :persistent="isRevoking"
      @cancel="cancelRevoke"
      @close="cancelRevoke"
      @confirm="revoke"
    >
      <p class="text-sm text-neutral-500 dark:text-neutral-400">
        {{ t("apiTokens.revokeConfirm") }}
      </p>
    </ConfirmDialog>
  </Card>
</template>
