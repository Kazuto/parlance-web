import { describe, expect, it } from "vitest";
import { ConfirmDialog } from "@thkzt/eunoia";
import DeletedEntriesPage from "~/pages/entries/deleted.vue";
import {
  VIEWER,
  loginAs,
  mockRpc,
  mountPage,
  pagination,
  settle,
  t,
} from "../helpers";

const deletedEntries = [
  {
    id: "e1",
    key: "checkout.title",
    defaultTranslation: "Checkout",
    deletedAt: "2026-10-20T10:00:00Z",
  },
  {
    id: "e2",
    key: "legacy.banner",
    defaultTranslation: "Old banner",
    deletedAt: "2026-10-01T10:00:00Z",
  },
];

async function openDeleted(entries = deletedEntries) {
  const lists: Record<string, unknown>[] = [];
  const restores: unknown[] = [];
  const restored = new Set<string>();

  loginAs([...VIEWER, "delete_entry"]);
  mockRpc("EntryService/ListEntries", (body) => {
    lists.push(body);

    const remaining = entries.filter((entry) => !restored.has(entry.id));

    return { entries: remaining, pagination: pagination(remaining.length) };
  });
  mockRpc("EntryService/RestoreEntry", (body) => {
    restores.push(body);
    restored.add(String(body.id));

    return { entry: entries.find((entry) => entry.id === body.id) };
  });

  const page = await mountPage(DeletedEntriesPage);

  return { page, lists, restores };
}

describe("deleted entries", () => {
  it("lists only deleted entries, the most recently deleted first", async () => {
    const { page, lists } = await openDeleted();

    expect(lists[0]).toMatchObject({
      deletedOnly: true,
      summary: true,
      filter: { sort: "deleted_at", order: "desc" },
    });
    expect(page.wrapper.text()).toContain("checkout.title");
    expect(page.wrapper.text()).toContain("Old banner");
  });

  it("restores an entry once confirmed", async () => {
    const { page, restores } = await openDeleted();
    const restore = page.wrapper.findAll(
      `button[aria-label="${t("entries.restore")}"]`,
    );

    expect(restore).toHaveLength(2);

    await restore[0]!.trigger("click");
    await settle();

    const dialog = page.wrapper
      .findAllComponents(ConfirmDialog)
      .find((confirm) => confirm.props("open"))!;

    expect(dialog.props("title")).toBe(
      t("entries.restoreTitle", { key: "checkout.title" }),
    );

    dialog.vm.$emit("confirm");
    await settle();

    expect(restores).toEqual([{ id: "e1" }]);
    // The list reloads without it.
    expect(page.wrapper.text()).not.toContain("checkout.title");
  });

  it("explains an empty list", async () => {
    const { page } = await openDeleted([]);

    expect(page.wrapper.text()).toContain(t("entries.deletedEmpty"));
    expect(page.wrapper.text()).toContain(t("entries.deletedEmptyHint"));
  });
});
