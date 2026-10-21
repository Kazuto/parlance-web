import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import DefaultLayout from "~/layouts/default.vue";
import DashboardPage from "~/pages/index.vue";
import {
  ALL_PERMISSIONS,
  VIEWER,
  loginAs,
  makeUser,
  mountPage,
  settle,
} from "./helpers";

async function sidebarLinks() {
  const wrapper = await mountSuspended(DefaultLayout, {
    slots: { default: () => "content" },
  });
  await settle();
  return wrapper
    .find("nav")
    .findAll("a")
    .map((link) => link.attributes("href"));
}

describe("sidebar", () => {
  it("links a viewer only to the pages it may read", async () => {
    loginAs(VIEWER);

    expect(await sidebarLinks()).toEqual([
      "/",
      "/locales",
      "/entries",
      "/entries/transfer",
      "/glossary",
      "/scopes",
    ]);
  });

  it("links an admin to every page", async () => {
    loginAs(ALL_PERMISSIONS);

    expect(await sidebarLinks()).toEqual([
      "/",
      "/locales",
      "/entries",
      "/entries/transfer",
      "/glossary",
      "/scopes",
      "/roles",
      "/users",
    ]);
  });

  it.each([
    ["read_locale", "/locales"],
    ["read_entry", "/entries"],
    ["read_terminology", "/glossary"],
    ["read_scope", "/scopes"],
    ["read_role", "/roles"],
    ["read_user", "/users"],
  ])("needs %s for %s", async (permission, href) => {
    loginAs(ALL_PERMISSIONS.filter((name) => name !== permission));
    expect(await sidebarLinks()).not.toContain(href);

    loginAs([permission]);
    expect(await sidebarLinks()).toContain(href);
  });

  it("always links the dashboard", async () => {
    loginAs([]);
    expect(await sidebarLinks()).toEqual(["/"]);
  });

  it("reloads the user so role changes made since sign-in apply", async () => {
    // The server now reports a viewer, but the browser still holds an admin.
    loginAs(VIEWER);
    useAuthStore().setUser(makeUser(ALL_PERMISSIONS));

    const links = await sidebarLinks();
    expect(links).not.toContain("/roles");
    expect(links).not.toContain("/users");
  });
});

describe("dashboard quick access", () => {
  async function cards(permissions: readonly string[]) {
    loginAs(permissions);
    const page = await mountPage(DashboardPage);
    return page.wrapper
      .findAll("a")
      .map((link) => link.attributes("href"))
      .filter((href) =>
        ["/locales", "/entries", "/glossary", "/users"].includes(href ?? ""),
      );
  }

  it("shows a viewer the content it may read", async () => {
    expect(await cards(VIEWER)).toEqual(["/locales", "/entries", "/glossary"]);
  });

  it("adds users for read_user", async () => {
    expect(await cards([...VIEWER, "read_user"])).toEqual([
      "/locales",
      "/entries",
      "/glossary",
      "/users",
    ]);
  });

  it("explains when nothing is accessible", async () => {
    loginAs([]);
    const page = await mountPage(DashboardPage);
    expect(page.wrapper.text()).toContain(
      useNuxtApp().$i18n.t("dashboard.noAccess"),
    );
  });
});
