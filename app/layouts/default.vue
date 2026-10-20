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

const { user, logout } = useAuthStore();
const { t } = useI18n();

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

const menuItems = computed<MenuItem[]>(() => [
  { label: t("nav.dashboard"), to: "/", icon: "house-simple" },
  { label: t("nav.locales"), to: "/locales", icon: "globe-simple" },
  { label: t("nav.entries"), to: "/entries", icon: "book" },
  {
    label: t("nav.transfer"),
    to: "/entries/transfer",
    icon: "arrows-down-up",
  },
  { label: t("nav.glossary"), to: "/glossary", icon: "tag-simple" },
  { label: t("nav.scopes"), to: "/scopes", icon: "stack" },
  { label: t("nav.roles"), to: "/roles", icon: "shield" },
  { label: t("nav.users"), to: "/users", icon: "users" },
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
      <div class="flex px-3 pt-3.5 pb-1">
        <SidebarToggle v-model:collapsed="sidebarCollapsed" />
      </div>
      <Menu class="p-3 pt-1" :items="menuItems" :current-path="route.path" />
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
