import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "@thkzt/eunoia";
import AccountPage from "~/pages/account.vue";
import type { DOMWrapper, VueWrapper } from "@vue/test-utils";
import type { ApiToken } from "~/lib/api/schemas/parlance/v1/AccountSchema";
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

const DAY = 24 * 60 * 60 * 1000;
const at = (offset: number) => new Date(Date.now() + offset).toISOString();

// Newest first, as the server lists them: one expired, one that never expires.
const listed: ApiToken[] = [
  {
    id: "t2",
    name: "Deploy",
    prefix: "plc_def456",
    createdAt: at(-30 * DAY),
    expiresAt: at(-DAY),
  },
  {
    id: "t1",
    name: "CI",
    prefix: "plc_abc123",
    createdAt: at(-10 * DAY),
    lastUsedAt: at(-60_000),
  },
];

const SECRET = "plc_ghi789-the-rest-of-the-secret";

/** Opens "My account", whose tokens anyone may manage. */
async function openTokens() {
  const calls: { method: string; body: Record<string, unknown> }[] = [];
  let tokens = [...listed];

  loginAs(VIEWER);
  useAuthStore().setUser(makeUser(VIEWER));
  mockRpc("AccountService/ListApiTokens", () => ({ tokens }));
  mockRpc("AccountService/CreateApiToken", (body) => {
    calls.push({ method: "CreateApiToken", body });

    const token = {
      id: "t3",
      name: String(body.name),
      prefix: SECRET.slice(0, 10),
      createdAt: at(0),
      expiresAt: at(Number(body.expiresInDays) * DAY),
    };

    tokens = [token, ...tokens];

    return { token, secret: SECRET };
  });
  mockRpc("AccountService/DeleteApiToken", (body) => {
    calls.push({ method: "DeleteApiToken", body });
    tokens = tokens.filter((token) => token.id !== body.id);

    return {};
  });

  const page = await mountPage(AccountPage);

  return { page, calls };
}

const row = (page: MountedPage, name: string) =>
  page.wrapper
    .findAll("li")
    .find((item) => item.find("span.font-medium").text() === name);

const dialog = (page: MountedPage) => page.wrapper.find("dialog[open]");

/** Clicks a button in the page, or in the open dialog when given it. */
async function click(within: VueWrapper | DOMWrapper<Element>, label: string) {
  await within
    .findAll("button")
    .filter((item) => !item.element.closest("dialog:not([open])"))
    .find(
      (item) =>
        item.text().trim() === label || item.attributes("aria-label") === label,
    )!
    .trigger("click");
  await settle();
}

describe("API tokens", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists the tokens by name and start, with when they were used and expire", async () => {
    const { page } = await openTokens();
    const ci = row(page, "CI")!.text();
    const deploy = row(page, "Deploy")!.text();

    expect(ci).toContain("plc_abc123…");
    expect(ci).toContain(t("apiTokens.lastUsedAt", { time: "" }).trim());
    expect(ci).toContain(t("apiTokens.neverExpires"));
    expect(ci).not.toContain(t("apiTokens.expired"));

    expect(deploy).toContain(t("apiTokens.expired"));
    expect(deploy).toContain(t("apiTokens.neverUsed"));
    expect(deploy).not.toContain(t("apiTokens.expiresAt", { time: "" }).trim());
  });

  it("creates a token and shows its secret this once", async () => {
    const { page, calls } = await openTokens();
    const writeText = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(navigator, "clipboard", "get").mockReturnValue({
      writeText,
    } as unknown as Clipboard);

    await click(page.wrapper, t("apiTokens.create"));
    await dialog(page).find("input").setValue("Release");
    await click(dialog(page), t("apiTokens.create"));

    // 90 days unless chosen otherwise.
    expect(calls).toEqual([
      {
        method: "CreateApiToken",
        body: { name: "Release", expiresInDays: 90 },
      },
    ]);
    expect(dialog(page).text()).toContain(t("apiTokens.copyNow"));
    expect(dialog(page).find("[data-testid='api-token-secret']").text()).toBe(
      SECRET,
    );

    await click(dialog(page), t("apiTokens.copy"));
    expect(writeText).toHaveBeenCalledWith(SECRET);

    await click(dialog(page), t("apiTokens.done"));

    expect(dialog(page).exists()).toBe(false);
    expect(page.wrapper.html()).not.toContain(SECRET);
    expect(row(page, "Release")!.text()).toContain("plc_ghi789…");
  });

  it("asks for a name", async () => {
    const { page, calls } = await openTokens();

    await click(page.wrapper, t("apiTokens.create"));
    await click(dialog(page), t("apiTokens.create"));

    expect(calls).toEqual([]);
    expect(dialog(page).text()).toContain(t("apiTokens.nameRequired"));
  });

  it("revokes a token once confirmed", async () => {
    const { page, calls } = await openTokens();

    await click(page.wrapper, t("apiTokens.revokeFor", { name: "CI" }));

    const confirm = page.wrapper
      .findAllComponents(ConfirmDialog)
      .find((item) => item.props("open"))!;

    expect(confirm.props("title")).toBe(
      t("apiTokens.revokeTitle", { name: "CI" }),
    );

    confirm.vm.$emit("confirm");
    await settle();

    expect(calls).toEqual([{ method: "DeleteApiToken", body: { id: "t1" } }]);
    expect(row(page, "CI")).toBeUndefined();
  });
});
