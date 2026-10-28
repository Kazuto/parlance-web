import { describe, expect, it } from "vitest";
import SettingsPage from "~/pages/settings.vue";
import { loginAs, mockRpc, mountPage, settle, t } from "./helpers";

/** The settings as the server sends them: JSON leaves out a false bool. */
function serverSettings(open: boolean) {
  return {
    ...(open ? { open } : {}),
    updatedAt: "2026-10-28T11:14:33Z",
  };
}

/** Opens the settings with registration open or closed on the server. */
async function openSettings(permissions: readonly string[], open = true) {
  const calls: Record<string, unknown>[] = [];
  let settings = serverSettings(open);

  loginAs(permissions);
  mockRpc("UserService/GetRegistrationSettings", () => ({ settings }));
  mockRpc("UserService/UpdateRegistrationSettings", (body) => {
    calls.push(body);
    settings = serverSettings(!!body.open);

    return { settings };
  });

  const page = await mountPage(SettingsPage);
  const toggle = () =>
    page.wrapper.find<HTMLInputElement>(
      `input[role="switch"][aria-label="${t("registration.title")}"]`,
    );

  return { page, calls, toggle };
}

describe("registration settings", () => {
  it("lets those who may add users close registration", async () => {
    const { page, calls, toggle } = await openSettings([
      "read_user",
      "create_user",
    ]);

    expect(toggle().element.checked).toBe(true);
    expect(page.wrapper.text()).toContain(t("registration.openHint"));

    await toggle().setValue(false);
    await settle();

    expect(calls).toEqual([{ open: false }]);
    expect(page.wrapper.text()).toContain(t("registration.closedHint"));
  });

  it("shows readers whether registration is open, without letting them change it", async () => {
    const { page, toggle } = await openSettings(["read_user"], false);

    expect(toggle().element.checked).toBe(false);
    expect(toggle().attributes("disabled")).toBeDefined();
    expect(page.wrapper.text()).toContain(t("registration.closedHint"));
  });

  it("is hidden from those who may not see users", async () => {
    const { page, toggle } = await openSettings(["read_sso_provider"]);

    expect(toggle().exists()).toBe(false);
    expect(page.wrapper.text()).not.toContain(t("registration.title"));
  });
});
