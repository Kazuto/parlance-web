import { describe, expect, it } from "vitest";
import ScopesPage from "~/pages/scopes/index.vue";
import {
  VIEWER,
  loginAs,
  mockRpc,
  mountPage,
  pagination,
  settle,
  t,
  type MountedPage,
} from "../helpers";

const createdAt = "2026-09-01T10:00:00Z";
const MANAGER = [...VIEWER, "create_tag", "update_tag", "delete_tag"];

type Tag = { id: string; scopeId: string; name: string; entryCount: number };

/** Opens the scopes page over a server that keeps the tags it is sent. */
async function openScopes(permissions: readonly string[] = MANAGER) {
  let tags: Tag[] = [
    { id: "t1", scopeId: "s1", name: "Checkout", entryCount: 4 },
    { id: "t2", scopeId: "s1", name: "Errors", entryCount: 0 },
    { id: "t3", scopeId: "s1", name: "Onboarding", entryCount: 1 },
    { id: "t4", scopeId: "s1", name: "Settings", entryCount: 2 },
    { id: "t5", scopeId: "s1", name: "Signup", entryCount: 0 },
  ];
  const calls: Record<string, Record<string, unknown>[]> = {
    create: [],
    update: [],
    delete: [],
  };

  loginAs(permissions);
  mockRpc("ScopeService/ListScopes", () => ({
    scopes: [
      { id: "s1", name: "Frontend", slug: "frontend", createdAt, tags },
      { id: "s2", name: "Backend", slug: "backend", createdAt, tags: [] },
    ],
    pagination: pagination(2),
  }));
  mockRpc("ScopeService/CreateTag", (body) => {
    calls.create!.push(body);

    const tag = {
      id: `t${tags.length + 1}`,
      scopeId: String(body.scopeId),
      name: String(body.name),
      entryCount: 0,
    };

    tags = [...tags, tag].toSorted((a, b) => a.name.localeCompare(b.name));

    return { tag };
  });
  mockRpc("ScopeService/UpdateTag", (body) => {
    calls.update!.push(body);
    tags = tags.map((tag) =>
      tag.id === body.id ? { ...tag, name: String(body.name) } : tag,
    );

    return { tag: tags.find((tag) => tag.id === body.id) };
  });
  mockRpc("ScopeService/DeleteTag", (body) => {
    calls.delete!.push(body);
    tags = tags.filter((tag) => tag.id !== body.id);

    return {};
  });

  const page = await mountPage(ScopesPage);

  return { page, calls };
}

const row = (page: MountedPage, name: string) =>
  page.wrapper
    .findAll("tr")
    .find((candidate) => candidate.text().includes(name))!;

async function manageTags(page: MountedPage, scope: string) {
  await row(page, scope)
    .find(`button[aria-label="${t("tags.manage")}"]`)
    .trigger("click");
  await settle();

  return page.wrapper.find("dialog[open]");
}

const dialogButton = (page: MountedPage, label: string) =>
  page.wrapper
    .findAll("dialog[open] button")
    .find(
      (button) =>
        button.attributes("aria-label") === label ||
        button.text().trim() === label,
    )!;

/** The tag names listed in the open dialog. */
const listedTags = (page: MountedPage) =>
  page.wrapper
    .findAll("dialog[open] li")
    .map((item) => item.find(".min-w-0").text());

describe("tags on the scopes page", () => {
  it("shows a few tags of each scope and counts the rest", async () => {
    const { page } = await openScopes(VIEWER);
    const frontend = row(page, "Frontend").text();

    expect(frontend).toContain("Checkout");
    expect(frontend).toContain("Onboarding");
    expect(frontend).not.toContain("Signup");
    expect(frontend).toContain(t("tags.more", { count: 2 }));
  });

  it.each([
    [VIEWER, 0],
    // Tags have permissions of their own, apart from the scopes'.
    [[...VIEWER, "update_scope"], 0],
    [[...VIEWER, "create_tag"], 2],
    [[...VIEWER, "delete_tag"], 2],
  ])(
    "offers to manage tags to users with a tag permission",
    async (permissions, buttons) => {
      const { page } = await openScopes(permissions);

      expect(
        page.iconButtons().filter((label) => label === t("tags.manage")),
      ).toHaveLength(buttons);
    },
  );

  it("offers each tag action only with its permission", async () => {
    const actions = async (permissions: readonly string[]) => {
      const { page } = await openScopes([...VIEWER, ...permissions]);
      const dialog = await manageTags(page, "Frontend");
      const result = {
        add: dialog.find("input").exists(),
        rename: page
          .iconButtons()
          .includes(t("tags.renameLabel", { name: "Checkout" })),
        delete: page
          .iconButtons()
          .includes(t("tags.deleteLabel", { name: "Checkout" })),
      };

      page.wrapper.unmount();

      return result;
    };

    expect(await actions(["create_tag"])).toEqual({
      add: true,
      rename: false,
      delete: false,
    });
    expect(await actions(["update_tag"])).toEqual({
      add: false,
      rename: true,
      delete: false,
    });
    expect(await actions(["delete_tag"])).toEqual({
      add: false,
      rename: false,
      delete: true,
    });
  });

  it("adds a tag to the scope", async () => {
    const { page, calls } = await openScopes();
    const dialog = await manageTags(page, "Frontend");

    expect(dialog.text()).toContain(
      t("tags.dialogTitle", { scope: "Frontend" }),
    );

    await dialog.find("input").setValue("  Pricing ");
    await dialog.find("form").trigger("submit");
    await settle();

    expect(calls.create).toEqual([{ scopeId: "s1", name: "Pricing" }]);
    expect(listedTags(page)).toContain("Pricing");
    expect(
      page.wrapper.find<HTMLInputElement>("dialog[open] input").element.value,
    ).toBe("");
  });

  it("needs a name to add a tag", async () => {
    const { page, calls } = await openScopes();
    const dialog = await manageTags(page, "Backend");

    expect(dialog.text()).toContain(t("tags.empty"));

    await dialog.find("input").setValue("   ");
    await dialog.find("form").trigger("submit");
    await settle();

    expect(calls.create).toEqual([]);
    expect(page.wrapper.find("dialog[open]").text()).toContain(
      t("tags.nameRequired"),
    );
  });

  it("renames a tag in its row", async () => {
    const { page, calls } = await openScopes();

    await manageTags(page, "Frontend");
    await dialogButton(
      page,
      t("tags.renameLabel", { name: "Checkout" }),
    ).trigger("click");
    await settle();

    const item = page.wrapper.findAll("dialog[open] li")[0]!;

    await item.find("input").setValue("Cart");
    await item.find("form").trigger("submit");
    await settle();

    expect(calls.update).toEqual([{ id: "t1", name: "Cart" }]);
    expect(listedTags(page)).toContain("Cart");
  });

  it("deletes a tag once confirmed, saying how many entries lose it", async () => {
    const { page, calls } = await openScopes();

    await manageTags(page, "Frontend");
    await dialogButton(
      page,
      t("tags.deleteLabel", { name: "Checkout" }),
    ).trigger("click");
    await settle();

    expect(page.wrapper.find("dialog[open] [role=alert]").text()).toBe(
      t("tags.deleteConfirm", { name: "Checkout", count: 4 }, 4),
    );
    expect(calls.delete).toEqual([]);

    await dialogButton(page, t("common.delete")).trigger("click");
    await settle();

    expect(calls.delete).toEqual([{ id: "t1" }]);
    expect(listedTags(page)).not.toContain("Checkout");
  });
});
