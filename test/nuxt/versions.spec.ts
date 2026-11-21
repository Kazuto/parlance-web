import { afterEach, describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import DefaultLayout from "~/layouts/default.vue";
import AccountPage from "~/pages/account.vue";
import SettingsPage from "~/pages/settings.vue";
import {
  VIEWER,
  loginAs,
  mockRpc,
  mountPage,
  settle,
  t,
  type MountedPage,
} from "./helpers";

const release = (version: string) => ({
  version,
  url: `https://github.com/Kazuto/parlance-server/releases/tag/v${version}`,
  publishedAt: "2026-11-01T10:00:00Z",
});

function runVersions(web: string, server?: string) {
  useRuntimeConfig().public.appVersion = web;
  mockRpc("AuthService/GetCurrentUser", { serverVersion: server });
}

afterEach(() => {
  useRuntimeConfig().public.appVersion = "dev";
});

const testId = (page: MountedPage, id: string) =>
  page.wrapper.find(`[data-testid="${id}"]`);

describe("the running versions", () => {
  it("show on everyone's account page", async () => {
    loginAs(VIEWER);
    runVersions("1.2.1", "2.0.0");

    const page = await mountPage(AccountPage);

    expect(testId(page, "version-web").text()).toBe("1.2.1");
    expect(testId(page, "version-server").text()).toBe("2.0.0");
    expect(testId(page, "version-mismatch").exists()).toBe(false);
  });

  it("warn when the server runs a major version the web app isn't made for", async () => {
    loginAs(VIEWER);
    runVersions("1.2.1", "3.0.0");

    const page = await mountPage(AccountPage);

    expect(testId(page, "version-mismatch").text()).toBe(
      t("versions.mismatch", { major: 2, version: "3.0.0" }),
    );
  });

  it("don't warn about builds that aren't releases", async () => {
    loginAs(VIEWER);
    runVersions("dev", "dev");

    const page = await mountPage(AccountPage);

    expect(testId(page, "version-mismatch").exists()).toBe(false);
  });

  it("call a server that doesn't tell its version unknown", async () => {
    loginAs(VIEWER);
    runVersions("1.2.1");

    const page = await mountPage(AccountPage);

    expect(testId(page, "version-server").text()).toBe(t("versions.unknown"));
  });
});

describe("updates", () => {
  const UPDATER = [...VIEWER, "read_update"];

  async function openSettings(
    updates: object,
    permissions: readonly string[] = UPDATER,
  ) {
    let asked = 0;

    loginAs(permissions);
    mockRpc("UpdateService/GetUpdates", () => {
      asked++;

      return updates;
    });

    const page = await mountPage(SettingsPage);

    return { page, asked: () => asked };
  }

  it("show newer releases with their notes", async () => {
    runVersions("1.2.1", "2.0.0");

    const { page } = await openSettings({
      enabled: true,
      server: release("2.1.0"),
      web: release("1.2.1"),
      checkedAt: "2026-11-21T08:00:00Z",
    });
    const server = testId(page, "update-server");

    expect(server.text()).toContain(
      t("versions.available", { version: "2.1.0" }),
    );
    expect(server.find("a").attributes("href")).toBe(release("2.1.0").url);
    expect(testId(page, "update-web").text()).toContain(t("versions.upToDate"));
    expect(testId(page, "updates-checked").exists()).toBe(true);
  });

  it("only name the newest release to builds that aren't releases", async () => {
    runVersions("dev", "dev");

    const { page } = await openSettings({
      enabled: true,
      server: release("2.1.0"),
      web: release("1.3.0"),
    });

    expect(testId(page, "update-web").text()).toContain(
      t("versions.newest", { version: "1.3.0" }),
    );
    expect(testId(page, "update-web").find("a").exists()).toBe(false);
  });

  it("say when the server doesn't check", async () => {
    const { page } = await openSettings({});

    expect(testId(page, "updates-off").text()).toBe(t("versions.checkOff"));
  });

  it("report a failed check", async () => {
    const error = "GitHub answered 403 Forbidden";
    const { page } = await openSettings({ enabled: true, error });

    expect(page.wrapper.text()).toContain(t("versions.checkFailed", { error }));
  });

  it("are left out without read_update", async () => {
    const { page, asked } = await openSettings({ enabled: true }, [
      ...VIEWER,
      "read_user",
    ]);

    expect(page.wrapper.find("#updates").exists()).toBe(false);
    expect(asked()).toBe(0);
  });
});

describe("the sidebar's update notice", () => {
  async function notice(permissions: readonly string[], updates: object) {
    loginAs(permissions);
    mockRpc("UpdateService/GetUpdates", updates);

    const wrapper = await mountSuspended(DefaultLayout, {
      slots: { default: () => "content" },
    });

    await settle();

    return wrapper.find('[data-testid="update-notice"]');
  }

  it("points to the settings when a newer release is out", async () => {
    runVersions("1.2.1", "2.0.0");

    const link = await notice([...VIEWER, "read_update"], {
      enabled: true,
      server: release("2.1.0"),
      web: release("1.2.1"),
    });

    expect(link.text()).toBe(t("versions.noticeAvailable"));
    expect(link.attributes("href")).toBe("/settings#updates");
  });

  it("points to the settings when the versions don't fit", async () => {
    runVersions("1.2.1", "3.0.0");

    const link = await notice([...VIEWER, "read_update"], { enabled: true });

    expect(link.text()).toBe(t("versions.noticeMismatch"));
  });

  it("stays away while everything is current, and without read_update", async () => {
    runVersions("1.2.1", "2.0.0");

    const current = { enabled: true, server: release("2.0.0") };

    expect((await notice([...VIEWER, "read_update"], current)).exists()).toBe(
      false,
    );
    expect(
      (
        await notice(VIEWER, { enabled: true, server: release("2.1.0") })
      ).exists(),
    ).toBe(false);
  });
});
