<script setup lang="ts">
import {
  Sidebar,
  SidebarToggle,
  Header,
  Menu,
  UserMenu,
  type MenuItem,
  type UserMenuItem,
  ToastStack,
  Page,
} from "@thkzt/eunoia";

const { user, logout } = useAuthStore();
const { t } = useI18n();

const route = useRoute();

const sidebarCollapsed = ref(false);

const onMenuSelect = (label: string) => {
  if (label === t("nav.signOut")) logout();
};

const menuItems: MenuItem[] = [
  { label: t("nav.dashboard"), to: "/", icon: "house-simple" },
  { label: t("nav.locales"), to: "/locales", icon: "globe-simple" },
  { label: t("nav.entries"), to: "/entries", icon: "book" },
  {
    label: t("nav.transfer"),
    to: "/entries/transfer",
    icon: "arrows-down-up",
  },
  { label: t("nav.terminologies"), to: "/terminologies", icon: "tag-simple" },
  { label: t("nav.scopes"), to: "/scopes", icon: "stack" },
  { label: t("nav.roles"), to: "/roles", icon: "shield" },
  { label: t("nav.users"), to: "/users", icon: "users" },
];

const userMenuItems: UserMenuItem[] = [
  { label: t("nav.signOut"), icon: "sign-out", variant: "danger" },
];

const toastStack = useTemplateRef("toastStack");

provide("toastStack", toastStack);

const pageOptions = usePageProvider();
const isDashboard = computed(() => route.path === "/");
const isWorkspace = computed(() => pageOptions.value.layout === "workspace");
const libraryPageOptions = computed(() => {
  const { layout: _layout, ...options } = pageOptions.value;
  return options;
});
const headerOptions = computed(() => {
  if (isDashboard.value) return {};
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
    class="flex h-dvh overflow-hidden flex-col bg-neutral-100 font-sans dark:bg-neutral-950"
  >
    <!-- Header -->
    <Header v-bind="headerOptions" class="shrink-0">
      <template #left>
        <SidebarToggle v-model:collapsed="sidebarCollapsed" />
        <h1
          v-if="isDashboard"
          class="text-xl font-bold text-neutral-900 dark:text-neutral-100"
        >
          {{ t("nav.dashboard") }}
        </h1>
      </template>

      <template #right>
        <UserMenu
          v-if="user"
          :name="user.name ?? undefined"
          :items="userMenuItems"
          @select="onMenuSelect"
        />
      </template>
    </Header>

    <!-- Body: Sidebar + Main -->
    <div class="flex min-h-0 flex-1 overflow-hidden">
      <Sidebar v-model:collapsed="sidebarCollapsed">
        <Menu class="p-3" :items="menuItems" :current-path="route.path" />
      </Sidebar>

      <main
        class="min-w-0 flex-1 mx-auto"
        :class="isWorkspace ? 'overflow-hidden' : 'overflow-y-auto'"
      >
        <Page
          v-bind="libraryPageOptions"
          :show-header="isDashboard"
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
  padding: 1.5rem;
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
    padding: 0.75rem;
    gap: 0.75rem;
  }
}
</style>
