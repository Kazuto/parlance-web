<script setup lang="ts">
import { Alert, Button, Dialog, Input, Select } from "@thkzt/eunoia";

// Creates an API token, then shows its secret: the only time anyone sees it.
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const store = useAccountStore();

const DEFAULT_LIFETIME = "90";

const name = ref("");
const lifetime = ref(DEFAULT_LIFETIME);
const secret = ref<string>();

// In days; 0 never expires.
const lifetimeOptions = computed(() => [
  { label: t("apiTokens.days", { count: 30 }, 30), value: "30" },
  { label: t("apiTokens.days", { count: 90 }, 90), value: "90" },
  { label: t("apiTokens.days", { count: 365 }, 365), value: "365" },
  { label: t("common.never"), value: "0" },
]);

const { error, isPending, submit, cancel } = useFormDialog({
  open: () => props.open,
  isPending: () => store.createApiToken.isPending,
  reset: () => {
    name.value = "";
    lifetime.value = DEFAULT_LIFETIME;
    secret.value = undefined;
  },
  close: () => emit("close"),
});

// Closed dialogs stay in the page, so the secret goes with closing.
watch(
  () => props.open,
  (open) => {
    if (!open) secret.value = undefined;
  },
);

function handleSubmit() {
  submit(async () => {
    if (!name.value.trim()) {
      error.value = t("apiTokens.nameRequired");

      return false;
    }

    const response = await store.createApiToken.mutateAsync({
      name: name.value.trim(),
      expiresInDays: Number(lifetime.value),
    });

    secret.value = response.secret ?? "";

    // Stays open to show the secret.
    return false;
  });
}

const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

async function copySecret() {
  if (!secret.value) return;

  try {
    await navigator.clipboard.writeText(secret.value);
  } catch {
    return;
  }

  copied.value = true;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => (copied.value = false), 1500);
}

onBeforeUnmount(() => clearTimeout(copiedTimer));
</script>

<template>
  <!-- With the secret shown, only "Done" closes, so it isn't lost to a stray click. -->
  <Dialog
    :open
    :title="t(secret ? 'apiTokens.createdTitle' : 'apiTokens.create')"
    :persistent="isPending || !!secret"
    @close="cancel"
  >
    <div v-if="secret" class="space-y-4">
      <Alert variant="warning" dense persistent>
        {{ t("apiTokens.copyNow") }}
      </Alert>
      <div class="flex items-center gap-2">
        <code
          class="min-w-0 flex-1 rounded-lg bg-neutral-100 px-2 py-1.5 font-mono text-xs break-all dark:bg-white/5"
          data-testid="api-token-secret"
          >{{ secret }}</code
        >
        <BaseIconButton
          :icon="copied ? 'check' : 'copy'"
          :label="t(copied ? 'common.copied' : 'apiTokens.copy')"
          @click="copySecret"
        />
      </div>
    </div>

    <form v-else class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="name"
        required
        :maxlength="100"
        :disabled="isPending"
        :placeholder="t('apiTokens.namePlaceholder')"
        :helper="t('apiTokens.nameHelp')"
      >
        {{ t("common.name") }}
      </Input>
      <Select
        v-model="lifetime"
        teleport-to="body"
        :options="lifetimeOptions"
        :disabled="isPending"
        >{{ t("apiTokens.expires") }}</Select
      >
      <Alert v-if="error" variant="danger" dense persistent>
        {{ error }}
      </Alert>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button v-if="secret" primary @click="emit('close')">
          {{ t("common.done") }}
        </Button>
        <template v-else>
          <Button type="button" ghost :disabled="isPending" @click="cancel">
            {{ t("common.cancel") }}
          </Button>
          <Button primary :disabled="isPending" @click="handleSubmit">
            {{ isPending ? t("common.creating") : t("apiTokens.create") }}
          </Button>
        </template>
      </div>
    </template>
  </Dialog>
</template>
