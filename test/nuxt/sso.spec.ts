import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import LoginPage from "~/pages/login.vue";
import CallbackPage from "~/pages/sso/callback.vue";
import SettingsPage from "~/pages/settings.vue";
import {
  ALL_PERMISSIONS,
  VIEWER,
  loginAs,
  logout,
  mockRpc,
  mountPage,
  settle,
  t,
  type MountedPage,
} from "./helpers";

const { reloadNuxtApp } = vi.hoisted(() => ({ reloadNuxtApp: vi.fn() }));

/** A token expiring in an hour; the app only decodes it. */
function token() {
  const payload = btoa(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).replace(/=+$/, "");

  return `header.${payload}.signature`;
}

mockNuxtImport("reloadNuxtApp", () => reloadNuxtApp);

// Closed dialogs stay in the DOM, so their buttons don't count.
const button = (page: MountedPage, label: string) =>
  page.wrapper
    .findAll("button, a")
    .filter((item) => !item.element.closest("dialog:not([open])"))
    .find(
      (item) =>
        item.text().trim() === label || item.attributes("aria-label") === label,
    );

/** The open dialog's form fields, by their label text. */
function dialogField(page: MountedPage, label: string) {
  const dialog = page.wrapper.find("dialog[open]");
  const labelEl = dialog
    .findAll("label")
    .find((item) => item.text().trim().startsWith(label));
  const id = labelEl?.attributes("for");

  return id ? dialog.find(`#${CSS.escape(id)}`) : labelEl!.find("input");
}

describe("signing in with a provider", () => {
  const assign = vi.fn();

  beforeEach(() => {
    reloadNuxtApp.mockClear();
    assign.mockClear();
    vi.spyOn(window.location, "assign").mockImplementation(assign);
    logout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("offers the enabled providers next to the password", async () => {
    const started: Record<string, unknown>[] = [];

    mockRpc("AuthService/ListSignInProviders", {
      providers: [{ id: "p1", name: "Keycloak" }],
    });
    mockRpc("AuthService/StartSso", (body) => {
      started.push(body);

      return { authorizationUrl: "https://auth.example/auth?state=s" };
    });

    const page = await mountPage(LoginPage, { route: "/login" });

    await button(page, t("auth.sso.signInWith", { name: "Keycloak" }))!.trigger(
      "click",
    );
    await settle();

    expect(started).toEqual([
      {
        providerId: "p1",
        redirectUri: `${window.location.origin}/sso/callback`,
      },
    ]);
    expect(assign).toHaveBeenCalledWith("https://auth.example/auth?state=s");
  });

  it("shows no providers when there are none", async () => {
    const page = await mountPage(LoginPage, { route: "/login" });

    expect(page.buttons()).toEqual([t("auth.signIn")]);
  });

  it("signs in with what the provider sent back", async () => {
    const finished: Record<string, unknown>[] = [];

    mockRpc("AuthService/FinishSso", (body) => {
      finished.push(body);

      return {
        accessToken: token(),
        refreshToken: token(),
        user: { id: "u1", email: "ada@example.com", name: "Ada" },
      };
    });

    await mountPage(CallbackPage, {
      route: "/sso/callback?state=s1&code=c1",
    });

    // The app starts over on the dashboard, without the code in the address.
    await vi.waitFor(() =>
      expect(reloadNuxtApp).toHaveBeenCalledWith({ path: "/" }),
    );
    expect(finished).toEqual([{ state: "s1", code: "c1" }]);
    expect(useAuthStore().user?.email).toBe("ada@example.com");
  });

  it("says why signing in failed", async () => {
    mockRpc("AuthService/FinishSso", () => {
      throw new Error("unreachable");
    });

    const refused = await mountPage(CallbackPage, {
      route: "/sso/callback?error=access_denied&error_description=Not+allowed",
    });

    expect(refused.wrapper.text()).toContain(t("auth.sso.refused"));
    expect(refused.wrapper.text()).toContain("Not allowed");
    expect(refused.wrapper.find('a[href="/login"]').text()).toBe(
      t("auth.sso.backToSignIn"),
    );
    expect(reloadNuxtApp).not.toHaveBeenCalled();
  });
});

describe("single sign-on settings", () => {
  const providers = [
    {
      id: "p1",
      name: "Keycloak",
      issuerUrl: "https://auth.example/realms/main",
      clientId: "parlance",
      hasClientSecret: true,
      defaultRoleId: "r1",
      enabled: true,
    },
    {
      id: "p2",
      name: "Old IdP",
      issuerUrl: "https://old.example",
      clientId: "parlance",
    },
  ];

  async function openSettings(permissions: readonly string[]) {
    const calls: { method: string; body: Record<string, unknown> }[] = [];

    loginAs(permissions);
    mockRpc("SsoProviderService/ListSsoProviders", { ssoProviders: providers });
    mockRpc("RoleService/ListRoles", {
      roles: [{ id: "r1", name: "translator" }],
      pagination: { page: 1, perPage: 100, total: 1, totalPages: 1 },
    });

    for (const method of ["CreateSsoProvider", "UpdateSsoProvider"]) {
      mockRpc(`SsoProviderService/${method}`, (body) => {
        calls.push({ method, body });

        return { ssoProvider: providers[0] };
      });
    }

    mockRpc("SsoProviderService/TestSsoProvider", (body) =>
      body.id === "p1"
        ? { ok: true }
        : {
            error: "oidc: issuer did not match the issuer returned by provider",
          },
    );

    const page = await mountPage(SettingsPage);

    return { page, calls };
  }

  it("is hidden without read_sso_provider", async () => {
    const { page } = await openSettings(VIEWER);

    expect(page.wrapper.text()).not.toContain(t("ssoProviders.title"));
  });

  it("lists the providers with the redirect URI to register", async () => {
    const { page } = await openSettings([...VIEWER, "read_sso_provider"]);
    const text = page.wrapper.text();

    expect(text).toContain(`${window.location.origin}/sso/callback`);
    expect(text).toContain("https://auth.example/realms/main");
    expect(text).toContain(
      t("ssoProviders.createsAccounts", { role: "translator" }),
    );
    expect(text).toContain(t("ssoProviders.existingUsersOnly"));
    expect(button(page, t("ssoProviders.add"))).toBeUndefined();
  });

  it("adds a provider that only lets existing users in", async () => {
    const { page, calls } = await openSettings(ALL_PERMISSIONS);

    await button(page, t("ssoProviders.add"))!.trigger("click");
    await settle();
    await dialogField(page, t("common.name")).setValue("Authentik");
    await dialogField(page, t("ssoProviders.issuerUrl")).setValue(
      "https://auth.example/application/o/parlance/",
    );
    await dialogField(page, t("ssoProviders.clientId")).setValue("parlance");
    await dialogField(page, t("ssoProviders.clientSecret")).setValue("s3cret");
    await page.wrapper.find("dialog[open] form").trigger("submit");
    await settle();

    expect(calls).toEqual([
      {
        method: "CreateSsoProvider",
        body: {
          name: "Authentik",
          issuerUrl: "https://auth.example/application/o/parlance/",
          clientId: "parlance",
          clientSecret: "s3cret",
          enabled: true,
        },
      },
    ]);
  });

  it("keeps the saved secret and role unless changed", async () => {
    const { page, calls } = await openSettings(ALL_PERMISSIONS);

    await button(page, t("common.editFor", { name: "Keycloak" }))!.trigger(
      "click",
    );
    await settle();
    await page.wrapper.find("dialog[open] form").trigger("submit");
    await settle();

    expect(calls.at(-1)).toEqual({
      method: "UpdateSsoProvider",
      body: {
        id: "p1",
        name: "Keycloak",
        issuerUrl: "https://auth.example/realms/main",
        clientId: "parlance",
        enabled: true,
        defaultRoleId: "r1",
      },
    });
  });

  it("tests a provider and shows the result", async () => {
    const { page } = await openSettings(ALL_PERMISSIONS);
    const tests = page.wrapper
      .findAll("button")
      .filter((item) => item.text().trim() === t("common.test"));

    await tests[0]!.trigger("click");
    await settle();
    expect(page.wrapper.text()).toContain(t("ssoProviders.testOk"));

    await tests[1]!.trigger("click");
    await settle();
    expect(page.wrapper.text()).toContain("issuer did not match");
  });
});
