import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { Select, SplitView } from "@thkzt/eunoia";
import type { VueWrapper } from "@vue/test-utils";
import EntriesPage from "~/pages/entries/index.vue";
import EntryFiltersPopover from "~/components/entry/FiltersPopover.vue";
import EntryFormDialog from "~/components/entry/FormDialog.vue";
import EntryTagsDialog from "~/components/entry/TagsDialog.vue";
import ScopeChip from "~/components/scope/Chip.vue";
import ScopeTagChip from "~/components/scope/TagChip.vue";
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

const locales = [{ id: "l1", code: "en", name: "English", isDefault: true }];

// Frontend and Backend have tags, Mobile has none.
const scopes = [
  {
    id: "s1",
    name: "Frontend",
    slug: "frontend",
    tags: [
      { id: "t1", scopeId: "s1", name: "Checkout" },
      { id: "t2", scopeId: "s1", name: "Onboarding" },
    ],
  },
  {
    id: "s2",
    name: "Backend",
    slug: "backend",
    tags: [{ id: "t3", scopeId: "s2", name: "Errors" }],
  },
  { id: "s3", name: "Mobile", slug: "mobile", tags: [] },
];

const entries = [
  {
    id: "e1",
    key: "checkout.pay",
    scopes: [{ id: "s1", name: "Frontend" }],
    tags: [{ id: "t1", scopeId: "s1", name: "Checkout" }],
    localizations: [],
  },
  { id: "e2", key: "errors.timeout", scopes: [], localizations: [] },
];

function mockScopes() {
  mockRpc("ScopeService/ListScopes", {
    scopes,
    pagination: pagination(scopes.length),
  });
}

async function openEntries(
  route = "/entries",
  permissions: readonly string[] = VIEWER,
) {
  const lists: Record<string, unknown>[] = [];
  const tagUpdates: Record<string, unknown>[] = [];

  loginAs(permissions);
  mockScopes();
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
  mockRpc("EntryService/ListEntries", (body) => {
    lists.push(body);

    return { entries, pagination: pagination(entries.length) };
  });
  mockRpc("EntryService/GetEntry", (body) => ({
    entry: entries.find((entry) => entry.id === body.id),
  }));
  mockRpc("EntryService/UpdateEntriesTags", (body) => {
    tagUpdates.push(body);

    return {};
  });

  const page = await mountPage(EntriesPage, { route });

  return { page, lists, tagUpdates };
}

const labels = (select: VueWrapper) =>
  (select.props() as { options: { label: string }[] }).options.map(
    (option) => option.label,
  );

const filters = (page: MountedPage) =>
  page.wrapper.findComponent(EntryFiltersPopover);

async function openFilters(page: MountedPage) {
  const button = page.wrapper
    .findAll("button")
    .find((item) => item.text().startsWith(t("common.filters")));

  await button!.trigger("click");
  await settle();
}

const tagFilter = (page: MountedPage) =>
  filters(page)
    .findAllComponents(Select)
    .find((select) => select.props("ariaLabel") === t("tags.title"));

/** The tags shown as removable chips above the list. */
const tagChips = (page: MountedPage) =>
  page.wrapper
    .findAllComponents(ScopeTagChip)
    .filter((chip) => chip.props("removable"))
    .map((chip) => chip.text());

/** What the latest list request filtered by. */
function filteredBy(lists: Record<string, unknown>[]) {
  const body = lists.at(-1) as { scopeIds?: string[]; tagIds?: string[] };

  return { scopes: body.scopeIds ?? [], tags: body.tagIds ?? [] };
}

describe("tag filter on the entries page", () => {
  it("shows up only once a scope is picked, with that scope's tags", async () => {
    const { page } = await openEntries();

    await openFilters(page);

    expect(tagFilter(page)).toBeUndefined();

    filters(page).vm.$emit("update:scopeIds", ["s1"]);
    await settle();

    expect(labels(tagFilter(page)!)).toEqual(["Checkout", "Onboarding"]);
  });

  it("names the scope of each tag once several scopes are picked", async () => {
    const { page } = await openEntries("/entries?scopes=s1,s2");

    await openFilters(page);

    expect(labels(tagFilter(page)!)).toEqual([
      t("tags.option", { scope: "Backend", tag: "Errors" }),
      t("tags.option", { scope: "Frontend", tag: "Checkout" }),
      t("tags.option", { scope: "Frontend", tag: "Onboarding" }),
    ]);
  });

  it("says when the picked scopes have no tags", async () => {
    const { page } = await openEntries("/entries?scopes=s3");

    await openFilters(page);

    const select = tagFilter(page)!;

    expect(select.props("disabled")).toBe(true);
    expect(select.props("placeholder")).toBe(t("tags.noneInScopes"));
  });

  it("filters the list by the tags of a link", async () => {
    const { page, lists } = await openEntries("/entries?scopes=s1&tags=t1");

    expect(filteredBy(lists)).toEqual({ scopes: ["s1"], tags: ["t1"] });
    expect(tagChips(page)).toEqual(["Checkout"]);
  });

  it("drops tags of a link whose scope isn't picked", async () => {
    const { page, lists } = await openEntries("/entries?scopes=s1&tags=t1,t3");

    expect(filteredBy(lists)).toEqual({ scopes: ["s1"], tags: ["t1"] });
    expect(tagChips(page)).toEqual(["Checkout"]);
    expect(useRouter().currentRoute.value.query.tags).toBe("t1");
  });

  it("drops a scope's tags with the scope", async () => {
    const { page, lists } = await openEntries(
      "/entries?scopes=s1,s2&tags=t1,t3",
    );

    expect(tagChips(page)).toEqual(["Checkout", "Errors"]);

    page.wrapper
      .findAllComponents(ScopeChip)
      .find((chip) => chip.props("removable") && chip.text() === "Frontend")!
      .vm.$emit("remove");
    await settle();

    expect(tagChips(page)).toEqual(["Errors"]);
    expect(filteredBy(lists)).toEqual({ scopes: ["s2"], tags: ["t3"] });

    await openFilters(page);
    filters(page).vm.$emit("update:scopeIds", []);
    await settle();

    expect(tagFilter(page)).toBeUndefined();
    expect(filteredBy(lists)).toEqual({ scopes: [], tags: [] });
  });

  it("filters by a tag of the open entry, and so by its scope", async () => {
    const { page, lists } = await openEntries();

    await page.wrapper
      .find(`[title="${t("entries.filterByTag", { tag: "Checkout" })}"]`)
      .trigger("click");
    await settle();

    expect(filteredBy(lists)).toEqual({ scopes: ["s1"], tags: ["t1"] });
  });
});

describe("tagging ticked entries", () => {
  it("picks tags from the chosen scopes, each either added or removed", async () => {
    const { page, tagUpdates } = await openEntries("/entries", [
      ...VIEWER,
      "update_entry",
    ]);

    page.wrapper
      .findComponent(SplitView)
      .vm.$emit("update:selection", ["e1", "e2"]);
    await settle();
    await page.wrapper
      .findAll("button")
      .find((button) => button.text() === t("entries.bulkEditTags"))!
      .trigger("click");
    await settle();

    const dialog = page.wrapper.findComponent(EntryTagsDialog);
    const selects = () => dialog.findAllComponents(Select);

    // Only the scopes until one is chosen.
    expect(selects()).toHaveLength(1);

    selects()[0]!.vm.$emit("update:modelValue", ["s1"]);
    await settle();

    expect(labels(selects()[1]!)).toEqual(["Checkout", "Onboarding"]);

    selects()[1]!.vm.$emit("update:modelValue", ["t2"]);
    await settle();

    // A tag being added can't be removed too.
    expect(labels(selects()[2]!)).toEqual(["Checkout"]);

    selects()[2]!.vm.$emit("update:modelValue", ["t1"]);
    await settle();
    await dialog
      .findAll("button")
      .find((button) => button.text() === t("common.applyChanges"))!
      .trigger("click");
    await settle();

    expect(tagUpdates).toEqual([
      { entryIds: ["e1", "e2"], addTagIds: ["t2"], removeTagIds: ["t1"] },
    ]);
  });
});

describe("tags in the entry form", () => {
  it("offers the tags of the entry's scopes and drops those of a removed scope", async () => {
    const updates: Record<string, unknown>[] = [];

    loginAs([...VIEWER, "update_entry"]);
    mockScopes();
    mockRpc("EntryService/UpdateEntry", (body) => {
      updates.push(body);

      return { entry: entries[0] };
    });

    const wrapper = await mountSuspended(EntryFormDialog, {
      props: { open: false, item: entries[0] },
      global: { provide: { toastStack: ref(null) } },
    });

    await wrapper.setProps({ open: true });
    await settle();

    const tagField = () =>
      wrapper
        .findAllComponents(Select)
        .find((select) => select.props("placeholder") === t("tags.select"));

    expect(labels(tagField()!)).toEqual(["Checkout", "Onboarding"]);
    expect(tagField()!.props("modelValue")).toEqual(["t1"]);

    // Swaps Frontend for Backend.
    wrapper.findAllComponents(Select)[0]!.vm.$emit("update:modelValue", ["s2"]);
    await settle();

    expect(labels(tagField()!)).toEqual(["Errors"]);
    expect(tagField()!.props("modelValue")).toEqual([]);

    await wrapper
      .findAll("button")
      .find((button) => button.text() === t("entries.saveEntry"))!
      .trigger("click");
    await settle();

    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ id: "e1", scopes: { ids: ["s2"] } });
    // Sent, so the server clears the entry's tags.
    expect(updates[0]).toHaveProperty("tags");
    expect((updates[0]!.tags as { ids?: string[] }).ids ?? []).toEqual([]);
  });
});
