import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import type { DOMWrapper } from "@vue/test-utils";
import { BottomNav } from "@thkzt/eunoia";
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

async function mountLayout() {
  const wrapper = await mountSuspended(DefaultLayout, {
    slots: { default: () => "content" },
  });

  await settle();

  return wrapper;
}

function hrefs(links: DOMWrapper<Element>[]) {
  return links.map((link) => link.attributes("href"));
}

async function sidebarLinks() {
  return hrefs((await mountLayout()).findAll("aside a"));
}

// The links on the phone's bottom bar, and those behind its "More" drawer.
async function bottomBarLinks() {
  const bar = (await mountLayout()).findComponent(BottomNav);

  return {
    bar: hrefs(bar.find("nav").findAll("a")),
    more: hrefs(bar.findAll("dialog a")),
  };
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
      "/settings",
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
      "/tasks",
      "/webhooks",
      "/settings",
    ]);
  });

  it.each([
    ["read_locale", "/locales"],
    ["read_entry", "/entries"],
    ["read_terminology", "/glossary"],
    ["read_scope", "/scopes"],
    ["read_task", "/tasks"],
    ["read_webhook", "/webhooks"],
    ["read_role", "/roles"],
    ["read_user", "/users"],
  ])("needs %s for %s", async (permission, href) => {
    loginAs(ALL_PERMISSIONS.filter((name) => name !== permission));
    expect(await sidebarLinks()).not.toContain(href);

    loginAs([permission]);
    expect(await sidebarLinks()).toContain(href);
  });

  it("always links the dashboard and the settings", async () => {
    loginAs([]);
    expect(await sidebarLinks()).toEqual(["/", "/settings"]);
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

describe("bottom bar", () => {
  it("puts the pages for translating on the bar and the rest behind More", async () => {
    loginAs(ALL_PERMISSIONS);

    expect(await bottomBarLinks()).toEqual({
      bar: ["/", "/locales", "/entries", "/glossary"],
      more: [
        "/entries/transfer",
        "/scopes",
        "/roles",
        "/users",
        "/tasks",
        "/webhooks",
        "/settings",
      ],
    });
  });

  it("links a viewer only to the pages it may read", async () => {
    loginAs(VIEWER);

    expect(await bottomBarLinks()).toEqual({
      bar: ["/", "/locales", "/entries", "/glossary"],
      more: ["/entries/transfer", "/scopes", "/settings"],
    });
  });

  it("needs no More drawer when the pages fit", async () => {
    loginAs([]);

    expect(await bottomBarLinks()).toEqual({
      bar: ["/", "/settings"],
      more: [],
    });
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
