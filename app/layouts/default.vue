<script setup lang="ts">
import {
  Sidebar,
  SidebarToggle,
  Header,
  Menu,
  UserMenu,
  ThemeToggle,
  type MenuItem,
  type UserMenuItem,
  ToastStack,
  Page,
  useTheme,
} from "@thkzt/eunoia";
import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";

const authStore = useAuthStore();
const { logout } = authStore;
// Follows changes to the user's own name and avatar.
const user = computed(() => authStore.user);
const { t } = useI18n();

// The stored user is only replaced on login and token refresh, so role changes made
// since then would not show. Reload it so the UI follows the current permissions.
const { data: currentUserData } = useQuery({
  ...api.auth.getCurrentUser.use({}),
  enabled: computed(() => authStore.isLoggedIn),
});

watch(currentUserData, (data) => {
  if (data?.user) authStore.setUser(data.user);
});

const route = useRoute();

useTheme();

const sidebarCollapsed = ref(false);

// The header lines its title and actions up with the page column inside <main>.
const mainEl = useTemplateRef<HTMLElement>("mainEl");

const onMenuSelect = (label: string) => {
  if (label === t("nav.signOut")) {
    logout();
  } else if (label === t("nav.settings")) {
    navigateTo("/settings");
  }
};

const { can, canAny } = usePermission();
const avatarUrl = useAvatarUrl();

// Only link pages the user can open; items without a permission are always shown.
const menuItems = computed<MenuItem[]>(() =>
  (
    [
      { label: t("nav.dashboard"), to: "/", icon: "house-simple" },
      {
        label: t("nav.locales"),
        to: "/locales",
        icon: "globe-simple",
        permission: "read_locale",
      },
      {
        label: t("nav.entries"),
        to: "/entries",
        icon: "translate",
        permission: "read_entry",
      },
      {
        label: t("nav.transfer"),
        to: "/entries/transfer",
        icon: "arrows-down-up",
        permission: ["import_entry", "export_entry"],
      },
      {
        label: t("nav.glossary"),
        to: "/glossary",
        icon: "book-open-text",
        permission: "read_terminology",
      },
      {
        label: t("nav.scopes"),
        to: "/scopes",
        icon: "stack",
        permission: "read_scope",
      },
      {
        label: t("nav.roles"),
        to: "/roles",
        icon: "shield",
        permission: "read_role",
      },
      {
        label: t("nav.users"),
        to: "/users",
        icon: "users",
        permission: "read_user",
      },
    ] satisfies (MenuItem & { permission?: string | string[] })[]
  )
    // A list of permissions shows the item for any of them.
    .filter(
      (item) =>
        !item.permission ||
        (Array.isArray(item.permission)
          ? canAny.value(item.permission)
          : can.value(item.permission)),
    )
    .map(({ permission: _permission, ...item }) => item),
);

// Configuring the instance: automation for those who may see it, and settings.
const settingsMenuItems = computed<MenuItem[]>(() => [
  ...(can.value("read_task")
    ? [{ label: t("nav.tasks"), to: "/tasks", icon: "lightning" }]
    : []),
  ...(can.value("read_webhook")
    ? [{ label: t("nav.webhooks"), to: "/webhooks", icon: "webhooks-logo" }]
    : []),
  { label: t("nav.settings"), to: "/settings", icon: "gear" },
]);

const userMenuItems = computed<UserMenuItem[]>(() => [
  { label: t("nav.settings"), icon: "gear", to: "/settings" },
  { label: t("nav.signOut"), icon: "sign-out", variant: "danger" },
]);

const toastStack = useTemplateRef("toastStack");

provide("toastStack", toastStack);

const pageOptions = usePageProvider();

const isWorkspace = computed(() => pageOptions.value.layout === "workspace");

const libraryPageOptions = computed(() => {
  const { layout: _layout, ...options } = pageOptions.value;

  return options;
});

const headerOptions = computed(() => {
  const {
    width: _width,
    showHeader: _showHeader,
    ...options
  } = libraryPageOptions.value;

  return options;
});
</script>

<template>
  <div
    class="flex h-dvh overflow-hidden bg-neutral-100 font-sans dark:bg-neutral-950"
  >
    <!-- Sidebar runs full height; its toggle sits at the top of it. -->
    <Sidebar
      v-model:collapsed="sidebarCollapsed"
      class="border-neutral-200 bg-transparent dark:border-white/5 dark:bg-transparent"
    >
      <!-- Settings sit at the bottom, apart from the pages; unlike the sidebar
           footer, this stays visible while collapsed. -->
      <div class="flex min-h-full flex-col">
        <div class="flex px-3 pt-3.5 pb-1">
          <SidebarToggle v-model:collapsed="sidebarCollapsed" />
        </div>
        <Menu class="p-3 pt-1" :items="menuItems" :current-path="route.path" />
        <!-- Menu puts its class on the list inside, so a wrapper does the pushing. -->
        <div class="mt-auto">
          <Menu
            class="p-3"
            :items="settingsMenuItems"
            :current-path="route.path"
          />
        </div>
      </div>
    </Sidebar>

    <!-- Header + Main -->
    <div class="flex min-w-0 flex-1 flex-col">
      <Header
        v-bind="headerOptions"
        transparent
        :width="pageOptions.width"
        :align-to="mainEl"
        class="shrink-0"
      >
        <template #right>
          <ThemeToggle />
          <UserMenu
            v-if="user"
            :name="user.name ?? undefined"
            :image="avatarUrl(user)"
            :items="userMenuItems"
            @select="onMenuSelect"
          />
        </template>
      </Header>

      <main
        ref="mainEl"
        class="min-h-0 min-w-0 flex-1"
        :class="isWorkspace ? 'overflow-hidden' : 'overflow-y-auto'"
      >
        <Page
          v-bind="libraryPageOptions"
          :class="{ 'workspace-page': isWorkspace }"
        >
          <slot />
        </Page>
      </main>
    </div>
  </div>

  <ToastStack ref="toastStack" position="bottom-right" />
</template>

<style scoped>
.workspace-page {
  width: 100%;
  height: 100%;
  min-height: 0;
  gap: 1.25rem;
  /* Only the vertical padding: the side padding comes from Page, which the header aligns with. */
  overflow: hidden;
}

.workspace-page :deep(> :last-child) {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

@media (max-width: 640px) {
  .workspace-page {
    gap: 0.75rem;
  }
}
</style>
