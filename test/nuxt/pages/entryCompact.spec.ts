import { afterEach, describe, expect, it, vi } from "vitest";
import EntriesPage from "~/pages/entries/index.vue";
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

const locales = [
  { id: "l1", code: "en", name: "English", isDefault: true },
  { id: "l2", code: "de", name: "German" },
];

const entries = [
  {
    id: "e1",
    key: "first",
    scopes: [],
    localizations: [{ id: "z1", localeId: "l1", translation: "Hello" }],
  },
  {
    id: "e2",
    key: "second",
    scopes: [],
    localizations: [{ id: "z2", localeId: "l1", translation: "Bye" }],
  },
];

// A phone: narrower than the 48rem where the sidebar gives way to the bottom
// navigation, and so also narrower than the 1100px the context panel closes at.
function onPhone() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: /48rem|1100px/.test(query),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

async function openEditor(route = "/entries?locales=en,de") {
  onPhone();
  loginAs([...VIEWER, "update_entry"]);
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
  mockRpc("EntryService/ListEntries", {
    entries,
    pagination: pagination(entries.length),
  });
  mockRpc("EntryService/GetEntry", (body) => ({
    entry: entries.find((entry) => entry.id === body.id),
  }));
  mockRpc("EntryService/GetEntryHistory", {
    history: [],
    pagination: pagination(0),
  });

  return mountPage(EntriesPage, { route, attach: true });
}

const openEntry = () => useRouter().currentRoute.value.query.entry;
const layout = (page: MountedPage) =>
  page.wrapper.find(".editor-split-view").classes().join(" ");
const button = (page: MountedPage, text: string) =>
  page.wrapper
    .findAll("button")
    .find(
      (candidate) =>
        candidate.text().includes(text) ||
        candidate.attributes("aria-label") === text,
    );

async function jumpTo(page: MountedPage, key: string) {
  await button(page, t("commands.open"))!.trigger("click");
  await settle();
  await page.wrapper
    .findAll('dialog[open] [role="option"]')
    .find((option) => option.text() === key)!
    .trigger("click");
  await settle();
}

describe("entries editor on a phone", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the list, with saving all as the footer's button", async () => {
    const page = await openEditor();

    expect(openEntry()).toBeUndefined();
    expect(layout(page)).toContain("[&>*:last-child]:hidden");
    expect(button(page, t("nav.allEntries"))).toBeUndefined();
    expect(button(page, t("common.saveAll"))).toBeDefined();
    expect(button(page, t("common.moreActions"))).toBeDefined();
    expect(button(page, t("common.saveChanges"))).toBeUndefined();
  });

  it("opens an entry on its own, moves on and goes back to the list", async () => {
    const page = await openEditor();

    await jumpTo(page, "second");

    expect(openEntry()).toBe("e2");
    expect(layout(page)).toContain("[&>*:first-child]:hidden");
    expect(button(page, t("common.saveChanges"))).toBeDefined();

    await button(page, t("commands.previousEntry"))!.trigger("click");
    await settle();

    expect(openEntry()).toBe("e1");
    expect(page.wrapper.find("#entry-e1-l1").exists()).toBe(true);

    await button(page, t("nav.allEntries"))!.trigger("click");
    await settle();

    expect(openEntry()).toBeUndefined();
    expect(layout(page)).toContain("[&>*:last-child]:hidden");
  });

  it("opens the entry a link names", async () => {
    const page = await openEditor("/entries?locales=en,de&entry=e2");

    expect(layout(page)).toContain("[&>*:first-child]:hidden");
    expect(page.wrapper.find("#entry-e2-l1").exists()).toBe(true);
  });

  it("shows the context in a bottom sheet", async () => {
    const page = await openEditor("/entries?locales=en,de&entry=e1");

    await button(page, t("context.openFor", { language: "German" }))!.trigger(
      "click",
    );
    await settle();

    const sheet = page.wrapper.find("dialog[open]");

    expect(sheet.exists()).toBe(true);
    expect(sheet.text()).toContain(t("context.title"));
    expect(sheet.findAll('[role="tab"]').length).toBe(3);
  });
});
