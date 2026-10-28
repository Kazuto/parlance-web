import { afterEach, describe, expect, it, vi } from "vitest";
import AccountPage from "~/pages/account.vue";
import {
  VIEWER,
  loginAs,
  makeUser,
  mockRpc,
  mountPage,
  settle,
  t,
  type MountedPage,
} from "./helpers";
import type { User } from "~/lib/api/schemas/parlance/v1/UserSchema";

/** Opens "My account" as a viewer, who may change nothing but their own account. */
async function openAccount(account: Partial<User> = {}) {
  const calls: { method: string; body: Record<string, unknown> }[] = [];

  loginAs(VIEWER);
  useAuthStore().setUser(makeUser(VIEWER, account));

  for (const method of [
    "AccountService/UpdateAccount",
    "AccountService/ChangePassword",
    "UserService/UpdateUser",
  ]) {
    mockRpc(method, (body) => {
      calls.push({ method, body });

      if (method !== "AccountService/UpdateAccount") return {};

      // As the server answers: a new image gets a new address, an empty one none.
      const avatar =
        body.avatar === undefined
          ? account.avatar
          : body.avatar
            ? "/avatars/user-1?v=2"
            : undefined;

      return { user: makeUser(VIEWER, { ...account, ...body, avatar }) };
    });
  }

  const page = await mountPage(AccountPage);

  return { page, calls };
}

const button = (page: MountedPage, label: string) =>
  page.wrapper.findAll("button").find((item) => item.text().trim() === label);

/** A form field by its label text. */
function field(page: MountedPage, label: string) {
  const labelEl = page.wrapper
    .findAll("label")
    .find((item) => item.text().trim().startsWith(label));
  const id = labelEl?.attributes("for");

  return id ? page.wrapper.find(`#${CSS.escape(id)}`) : labelEl!.find("input");
}

describe("account settings", () => {
  afterEach(async () => {
    await useNuxtApp().$i18n.setLocale("en");
  });

  it("lets a viewer change their language", async () => {
    const { page, calls } = await openAccount();

    await page.wrapper
      .findAll("button")
      .find((item) => item.text().includes("Deutsch"))!
      .trigger("click");

    // The language's texts load first.
    await vi.waitFor(() =>
      expect(calls).toEqual([
        { method: "AccountService/UpdateAccount", body: { locale: "de" } },
      ]),
    );
  });

  it("saves the name and email", async () => {
    const { page, calls } = await openAccount();

    await field(page, t("common.name")).setValue("Ada Lovelace");
    await page.wrapper.findAll("form")[0]!.trigger("submit");
    await settle();

    expect(calls).toEqual([
      {
        method: "AccountService/UpdateAccount",
        body: { name: "Ada Lovelace", email: "test@parlance.dev" },
      },
    ]);
  });

  it("changes the password with the current one", async () => {
    const { page, calls } = await openAccount({ hasPassword: true });

    await field(page, t("account.currentPassword")).setValue("old");
    await field(page, t("account.newPassword")).setValue("new-password");
    await field(page, t("common.confirmPassword")).setValue("typo");
    await page.wrapper.findAll("form")[1]!.trigger("submit");
    await settle();

    expect(calls).toEqual([]);
    expect(page.wrapper.text()).toContain(t("common.passwordMismatch"));

    await field(page, t("common.confirmPassword")).setValue("new-password");
    await page.wrapper.findAll("form")[1]!.trigger("submit");
    await settle();

    expect(calls).toEqual([
      {
        method: "AccountService/ChangePassword",
        body: { currentPassword: "old", newPassword: "new-password" },
      },
    ]);
  });

  it("sets a first password without asking for one", async () => {
    const { page } = await openAccount();

    expect(page.wrapper.text()).toContain(t("account.noPassword"));
    expect(page.wrapper.text()).not.toContain(t("account.currentPassword"));
    expect(button(page, t("account.setPassword"))).toBeDefined();
  });

  it("uploads and removes the avatar, loaded from the API", async () => {
    const { page, calls } = await openAccount({
      avatar: "/avatars/user-1?v=1",
    });

    expect(page.wrapper.find("img").attributes("src")).toBe(
      "http://api.test/avatars/user-1?v=1",
    );

    const input = page.wrapper.find<HTMLInputElement>('input[type="file"]');
    const file = new File([new Uint8Array([137, 80, 78, 71])], "me.png", {
      type: "image/png",
    });

    Object.defineProperty(input.element, "files", { value: [file] });
    await input.trigger("change");
    await settle();

    expect(calls.at(-1)).toEqual({
      method: "AccountService/UpdateAccount",
      body: { avatar: "iVBORw==" },
    });

    await button(page, t("account.removeAvatar"))!.trigger("click");
    await settle();

    expect(calls.at(-1)).toEqual({
      method: "AccountService/UpdateAccount",
      body: { avatar: "" },
    });
    expect(calls.some((call) => call.method === "UserService/UpdateUser")).toBe(
      false,
    );
  });
});
