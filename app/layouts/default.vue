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

const route = useRoute();

const sidebarCollapsed = ref(false);

const onMenuSelect = (label: string) => {
  if (label === "Sign Out") logout();
};

const menuItems: MenuItem[] = [
  { label: "Dashboard", to: "/", icon: "house-simple" },
  { label: "Locales", to: "/locales", icon: "globe-simple" },
  { label: "Entries", to: "/entries", icon: "book" },
  { label: "Terminologies", to: "/terminologies", icon: "tag-simple" },
  { label: "Roles", to: "/roles", icon: "group" },
  { label: "Users", to: "/users", icon: "users" },
];

const userMenuItems: UserMenuItem[] = [
  { label: "Sign Out", icon: "sign-out", variant: "danger" },
];

const toastStack = useTemplateRef("toastStack");

provide("toastStack", toastStack);

const pageOptions = usePageProvider();
</script>

<template>
  <div
    class="flex h-screen flex-col bg-neutral-100 font-sans dark:bg-neutral-950"
  >
    <!-- Header -->
    <Header>
      <template #left>
        <SidebarToggle v-model:collapsed="sidebarCollapsed" />
        <h1 class="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Dashboard
        </h1>
      </template>

      <template #right>
        <UserMenu
          v-if="user"
          :name="user.name"
          :items="userMenuItems"
          @select="onMenuSelect"
        />
      </template>
    </Header>

    <!-- Body: Sidebar + Main -->
    <div class="flex flex-1 overflow-hidden">
      <Sidebar v-model:collapsed="sidebarCollapsed">
        <Menu class="p-3" :items="menuItems" :current-path="route.path" />
      </Sidebar>

      <main class="flex-1 overflow-y-auto mx-auto">
        <Page v-bind="pageOptions">
          <slot />
        </Page>
      </main>
    </div>
  </div>

  <ToastStack ref="toastStack" position="bottom-right" />
</template>
