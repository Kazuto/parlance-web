<script setup lang="ts">
import { Avatar, Button, Card, Headline, Input, Text } from "@thkzt/eunoia";

// The signed-in user's own name, email, avatar and password, which everyone may
// change without a permission.
const { t } = useI18n();
const { showError, showSuccess } = useErrorHelper();
const authStore = useAuthStore();
const store = useAccountStore();
const avatarUrl = useAvatarUrl();

const user = computed(() => authStore.user);

const profile = ref({ name: "", email: "" });

watch(
  user,
  (current) => {
    profile.value = { name: current?.name ?? "", email: current?.email ?? "" };
  },
  { immediate: true },
);

const profileChanged = computed(
  () =>
    profile.value.name.trim() !== (user.value?.name ?? "") ||
    profile.value.email.trim() !== (user.value?.email ?? ""),
);

async function saveProfile() {
  const name = profile.value.name.trim();
  const email = profile.value.email.trim();

  if (!name || !email.includes("@")) {
    showError(t("account.profileRequired"));

    return;
  }

  try {
    await store.update.mutateAsync({ name, email });
    showSuccess(t("account.saved"));
  } catch (error) {
    showError(error);
  }
}

// Avatars: the server checks the type again, from the image itself.
const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const AVATAR_MAX_SIZE = 2 * 1024 * 1024;
const fileInput = useTemplateRef<HTMLInputElement>("fileInput");

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function uploadAvatar(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  input.value = "";

  if (!file) return;

  if (!AVATAR_TYPES.includes(file.type) || file.size > AVATAR_MAX_SIZE) {
    showError(t("account.avatarInvalid"));

    return;
  }

  try {
    await store.update.mutateAsync({ avatar: await readAsBase64(file) });
    showSuccess(t("account.avatarSaved"));
  } catch (error) {
    showError(error);
  }
}

async function removeAvatar() {
  try {
    // Empty bytes remove the avatar.
    await store.update.mutateAsync({ avatar: "" });
    showSuccess(t("account.avatarRemoved"));
  } catch (error) {
    showError(error);
  }
}

const password = ref({ current: "", next: "", confirm: "" });
const passwordError = ref<string>();

async function changePassword() {
  passwordError.value = undefined;

  if (!password.value.next) {
    passwordError.value = t("account.passwordRequired");

    return;
  }

  if (password.value.next !== password.value.confirm) {
    passwordError.value = t("common.passwordMismatch");

    return;
  }

  try {
    await store.changePassword.mutateAsync({
      currentPassword: password.value.current,
      newPassword: password.value.next,
    });

    password.value = { current: "", next: "", confirm: "" };
    showSuccess(t("account.passwordChanged"));
  } catch (error) {
    showError(error);
  }
}
</script>

<template>
  <Card>
    <div class="space-y-6">
      <div>
        <Headline :level="4">{{ t("account.title") }}</Headline>
        <Text muted size="sm">{{ t("account.description") }}</Text>
      </div>

      <div class="flex flex-wrap items-center gap-4">
        <Avatar
          size="xl"
          :src="avatarUrl(user)"
          :name="user?.name ?? undefined"
        />
        <div class="space-y-1">
          <div class="flex flex-wrap gap-2">
            <Button
              type="button"
              dense
              :disabled="store.update.isPending"
              @click="fileInput?.click()"
            >
              {{ t("account.uploadAvatar") }}
            </Button>
            <Button
              v-if="user?.avatar"
              type="button"
              dense
              ghost
              :disabled="store.update.isPending"
              @click="removeAvatar"
            >
              {{ t("account.removeAvatar") }}
            </Button>
          </div>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ t("account.avatarHelp") }}
          </p>
          <input
            ref="fileInput"
            type="file"
            class="hidden"
            accept="image/png,image/jpeg,image/webp,image/gif"
            :aria-label="t('account.uploadAvatar')"
            @change="uploadAvatar"
          />
        </div>
      </div>

      <form class="space-y-3" @submit.prevent="saveProfile">
        <div class="grid gap-3 sm:grid-cols-2">
          <Input
            v-model="profile.name"
            required
            autocomplete="name"
            :disabled="store.update.isPending"
            >{{ t("common.name") }}</Input
          >
          <Input
            v-model="profile.email"
            required
            type="email"
            autocomplete="email"
            :disabled="store.update.isPending"
            >{{ t("common.email") }}</Input
          >
        </div>
        <Button
          type="submit"
          dense
          primary
          :disabled="store.update.isPending || !profileChanged"
        >
          {{ t("common.saveChanges") }}
        </Button>
      </form>

      <form
        class="space-y-3 border-t border-neutral-200 pt-6 dark:border-neutral-800"
        @submit.prevent="changePassword"
      >
        <div>
          <div class="font-semibold">{{ t("common.password") }}</div>
          <Text v-if="!user?.hasPassword" muted size="sm">
            {{ t("account.noPassword") }}
          </Text>
        </div>
        <div class="grid gap-3 sm:grid-cols-3">
          <Input
            v-if="user?.hasPassword"
            v-model="password.current"
            type="password"
            autocomplete="current-password"
            :disabled="store.changePassword.isPending"
            >{{ t("account.currentPassword") }}</Input
          >
          <Input
            v-model="password.next"
            type="password"
            autocomplete="new-password"
            :disabled="store.changePassword.isPending"
            >{{ t("account.newPassword") }}</Input
          >
          <Input
            v-model="password.confirm"
            type="password"
            autocomplete="new-password"
            :disabled="store.changePassword.isPending"
            >{{ t("common.confirmPassword") }}</Input
          >
        </div>
        <p v-if="passwordError" role="alert" class="text-sm text-red-600">
          {{ passwordError }}
        </p>
        <Button
          type="submit"
          dense
          :disabled="store.changePassword.isPending || !password.next"
        >
          {{
            user?.hasPassword
              ? t("account.changePassword")
              : t("account.setPassword")
          }}
        </Button>
      </form>
    </div>
  </Card>
</template>
