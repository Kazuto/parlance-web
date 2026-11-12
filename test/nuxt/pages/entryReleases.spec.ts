import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { Select, SplitView } from "@thkzt/eunoia";
import type { VueWrapper } from "@vue/test-utils";
import EntriesPage from "~/pages/entries/index.vue";
import EntryFiltersPopover from "~/components/entry/FiltersPopover.vue";
import EntryFormDialog from "~/components/entry/FormDialog.vue";
import EntryReleasesDialog from "~/components/entry/ReleasesDialog.vue";
import ReleaseChip from "~/components/release/Chip.vue";
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

// Spring and Summer are pending, Summer without a date; Winter went out.
const spring = { id: "r1", name: "Spring", releaseAt: "2030-04-01T09:00:00Z" };
const releases = [
  spring,
  { id: "r2", name: "Summer" },
  {
    id: "r3",
    name: "Winter",
    releaseAt: "2026-01-10T09:00:00Z",
    releasedAt: "2026-01-10T09:00:00Z",
  },
];

// The API lists only pending releases on entries.
const entries = [
  {
    id: "e1",
    key: "checkout.pay",
    scopes: [],
    releases: [spring],
    localizations: [],
  },
  { id: "e2", key: "errors.timeout", scopes: [], localizations: [] },
];

function mockReleases(live = 0) {
  const counts: Record<string, unknown>[] = [];

  mockRpc("ReleaseService/ListReleases", {
    releases,
    pagination: pagination(releases.length),
  });
  mockRpc("ScopeService/ListScopes", { scopes: [], pagination: pagination(0) });
  mockRpc("EntryService/CountLiveEntries", (body) => {
    counts.push(body);

    return { count: live };
  });

  return counts;
}

async function openEntries(
  route = "/entries",
  permissions: readonly string[] = VIEWER,
  live = 0,
) {
  const lists: Record<string, unknown>[] = [];
  const releaseUpdates: Record<string, unknown>[] = [];

  loginAs(permissions);

  const counts = mockReleases(live);

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
  mockRpc("EntryService/UpdateEntriesReleases", (body) => {
    releaseUpdates.push(body);

    return {};
  });

  const page = await mountPage(EntriesPage, { route });

  return { page, lists, releaseUpdates, counts };
}

const labels = (select: VueWrapper) =>
  (select.props() as { options: { label: string }[] }).options.map(
    (option) => option.label,
  );

const filters = (page: MountedPage) =>
  page.wrapper.findComponent(EntryFiltersPopover);

async function openFilters(page: MountedPage) {
  await page.wrapper
    .findAll("button")
    .find((item) => item.text().startsWith(t("common.filters")))!
    .trigger("click");
  await settle();
}

const releaseFilter = (page: MountedPage) =>
  filters(page)
    .findAllComponents(Select)
    .find((select) => select.props("ariaLabel") === t("nav.releases"));

/** The releases shown as removable chips above the list. */
const releaseChips = (page: MountedPage) =>
  page.wrapper
    .findAllComponents(ReleaseChip)
    .filter((chip) => chip.props("removable"))
    .map((chip) => chip.text());

/** The releases the latest list request filtered by. */
const filteredBy = (lists: Record<string, unknown>[]) =>
  (lists.at(-1) as { releaseIds?: string[] }).releaseIds ?? [];

const releaseDate = (at: string) =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(at));

describe("release filter on the entries page", () => {
  it("offers every release and filters by the picked ones", async () => {
    const { page, lists } = await openEntries();

    await openFilters(page);

    expect(labels(releaseFilter(page)!)).toEqual([
      "Spring",
      "Summer",
      "Winter",
    ]);

    filters(page).vm.$emit("update:releaseIds", ["r1"]);
    await settle();

    expect(filteredBy(lists)).toEqual(["r1"]);
    expect(releaseChips(page)).toEqual(["Spring"]);
    expect(useRouter().currentRoute.value.query.releases).toBe("r1");
  });

  it("filters the list by the releases of a link, also those that went out", async () => {
    const { page, lists } = await openEntries("/entries?releases=r3");

    expect(filteredBy(lists)).toEqual(["r3"]);
    expect(releaseChips(page)).toEqual(["Winter"]);

    page.wrapper
      .findAllComponents(ReleaseChip)
      .find((chip) => chip.props("removable"))!
      .vm.$emit("remove");
    await settle();

    expect(filteredBy(lists)).toEqual([]);
  });

  it("hides the filter from those who may not see releases", async () => {
    const { page } = await openEntries(
      "/entries",
      VIEWER.filter((permission) => permission !== "read_release"),
    );

    await openFilters(page);

    expect(releaseFilter(page)).toBeUndefined();
  });

  it("shows the open entry's pending releases and filters by a click", async () => {
    const { page, lists } = await openEntries();
    const title = t("entries.filterByRelease", { release: "Spring" });
    const chip = page.wrapper.find(`[title="${title}"]`);

    expect(chip.text()).toBe(
      t("releases.chip", {
        name: "Spring",
        date: releaseDate(spring.releaseAt),
      }),
    );

    await chip.trigger("click");
    await settle();

    expect(filteredBy(lists)).toEqual(["r1"]);
  });
});

describe("adding ticked entries to releases", () => {
  async function openDialog(live: number) {
    const opened = await openEntries(
      "/entries",
      [...VIEWER, "update_entry"],
      live,
    );

    opened.page.wrapper
      .findComponent(SplitView)
      .vm.$emit("update:selection", ["e1", "e2"]);
    await settle();
    await opened.page.wrapper
      .findAll("button")
      .find((button) => button.text() === t("entries.bulkEditReleases"))!
      .trigger("click");
    await settle();

    const dialog = opened.page.wrapper.findComponent(EntryReleasesDialog);

    return {
      ...opened,
      dialog,
      selects: () => dialog.findAllComponents(Select),
    };
  }

  it("picks pending releases, each either added or removed", async () => {
    const { dialog, selects, releaseUpdates } = await openDialog(0);

    // Winter went out, so entries can't join it.
    expect(labels(selects()[0]!)).toEqual(["Spring", "Summer"]);

    selects()[0]!.vm.$emit("update:modelValue", ["r2"]);
    await settle();

    // A release being added can't be removed too.
    expect(labels(selects()[1]!)).toEqual(["Spring"]);

    selects()[1]!.vm.$emit("update:modelValue", ["r1"]);
    await settle();

    expect(dialog.text()).not.toContain(
      t("releases.liveWarning", { count: 0 }, 0),
    );

    await dialog
      .findAll("button")
      .find((button) => button.text() === t("common.applyChanges"))!
      .trigger("click");
    await settle();

    expect(releaseUpdates).toEqual([
      {
        entryIds: ["e1", "e2"],
        addReleaseIds: ["r2"],
        removeReleaseIds: ["r1"],
      },
    ]);
  });

  it("warns when entries with approved texts would leave exports", async () => {
    const { dialog, selects, counts } = await openDialog(1);
    const warning = t("releases.liveWarning", { count: 1 }, 1);

    // Only removing holds nothing back, so nothing is counted.
    selects()[1]!.vm.$emit("update:modelValue", ["r1"]);
    await settle();

    expect(counts).toEqual([]);
    expect(dialog.text()).not.toContain(warning);

    selects()[0]!.vm.$emit("update:modelValue", ["r2"]);
    await settle();

    expect(counts).toEqual([{ entryIds: ["e1", "e2"] }]);
    expect(dialog.text()).toContain(warning);
  });
});

describe("releases in the entry form", () => {
  async function openForm(permissions: readonly string[], live = 0) {
    const updates: Record<string, unknown>[] = [];

    loginAs(permissions);

    const counts = mockReleases(live);

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

    const releaseField = () =>
      wrapper
        .findAllComponents(Select)
        .find((select) => select.props("placeholder") === t("releases.select"));
    const save = async () => {
      await wrapper
        .findAll("button")
        .find((button) => button.text() === t("entries.saveEntry"))!
        .trigger("click");
      await settle();
    };

    return { wrapper, updates, counts, releaseField, save };
  }

  it("offers pending releases and warns before holding back a live entry", async () => {
    const { wrapper, updates, counts, releaseField, save } = await openForm(
      [...VIEWER, "update_entry"],
      1,
    );

    expect(labels(releaseField()!)).toEqual(["Spring", "Summer"]);
    expect(releaseField()!.props("modelValue")).toEqual(["r1"]);
    // The entry is already held, so keeping its release counts nothing.
    expect(counts).toEqual([]);
    expect(wrapper.text()).not.toContain(t("releases.liveWarningEntry"));

    releaseField()!.vm.$emit("update:modelValue", ["r1", "r2"]);
    await settle();

    expect(counts).toEqual([{ entryIds: ["e1"] }]);
    expect(wrapper.text()).toContain(t("releases.liveWarningEntry"));

    await save();

    expect(updates[0]).toMatchObject({
      id: "e1",
      releases: { ids: ["r1", "r2"] },
    });
  });

  it("leaves the releases alone for those who may not see them", async () => {
    const { updates, releaseField, save } = await openForm([
      ...VIEWER.filter((permission) => permission !== "read_release"),
      "update_entry",
    ]);

    expect(releaseField()).toBeUndefined();

    await save();

    expect(updates).toHaveLength(1);
    expect(updates[0]).not.toHaveProperty("releases");
  });
});
