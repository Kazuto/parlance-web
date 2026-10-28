import { describe, expect, it, vi } from "vitest";
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

const entry = {
  id: "e1",
  key: "settings.save",
  scopes: [],
  localizations: [
    {
      id: "z1",
      localeId: "l1",
      translation: "Save your changes",
      status: "REVIEW_STATUS_APPROVED",
    },
    {
      id: "z2",
      localeId: "l2",
      translation: "Speichern",
      status: "REVIEW_STATUS_DRAFT",
    },
  ],
};

// The second match has the field's text already.
const matches = [
  {
    entryId: "e2",
    key: "profile.save",
    sourceText: "Save your changes",
    translation: "Änderungen speichern",
    similarity: 1,
  },
  {
    entryId: "e3",
    key: "form.save",
    sourceText: "Save changes",
    translation: "Speichern",
    similarity: 0.7222222,
  },
];

type Request = Record<string, unknown>;

async function openEditor(permissions: readonly string[]) {
  const searches: Request[] = [];

  loginAs(permissions);
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
  mockRpc("EntryService/ListEntries", {
    entries: [entry],
    pagination: pagination(1),
  });
  mockRpc("EntryService/GetEntry", { entry });
  mockRpc("LocalizationService/SearchTranslationMemory", (body) => {
    searches.push(body as Request);

    return { matches };
  });

  const page = await mountPage(EntriesPage, {
    route: "/entries?locales=en,de",
    attach: true,
  });

  return { page, searches };
}

async function openPanel(page: MountedPage, language: string) {
  await page.wrapper
    .find(`button[aria-label="${t("context.openFor", { language })}"]`)
    .trigger("click");
  await settle();
}

async function chooseMemoryTab(page: MountedPage) {
  await page.wrapper
    .findAll('[role="tab"]')
    .find((tab) => tab.text().includes(t("context.memory")))!
    .trigger("click");
  await settle();
}

async function openMemory(page: MountedPage, language: string) {
  await openPanel(page, language);
  await chooseMemoryTab(page);
}

const memoryList = (page: MountedPage) =>
  page.wrapper.find(`ol[aria-label="${t("context.memory")}"]`);

const useButtons = (page: MountedPage) =>
  page.wrapper.findAll(`button[aria-label="${t("context.useMatch")}"]`);

const field = (page: MountedPage, localeId: string) =>
  page.wrapper.find<HTMLTextAreaElement>(`#entry-e1-${localeId}`);

describe("translation memory in the editor", () => {
  it("shows how similar default texts were translated", async () => {
    const { page, searches } = await openEditor(VIEWER);

    // Only the Memory tab asks.
    await openPanel(page, "German");
    expect(searches).toEqual([]);

    await chooseMemoryTab(page);
    await vi.waitFor(() => expect(memoryList(page).exists()).toBe(true));

    expect(searches).toEqual([
      {
        sourceText: "Save your changes",
        targetLocaleId: "l2",
        excludeEntryId: "e1",
      },
    ]);

    const items = memoryList(page)
      .findAll("li")
      .map((item) => item.text());

    expect(items).toHaveLength(2);
    expect(items[0]).toContain("100%");
    expect(items[0]).toContain("profile.save");
    expect(items[0]).toContain("Änderungen speichern");
    expect(items[1]).toContain("72%");
    expect(items[1]).toContain("Save changes");
    // The German field has the second match's translation already.
    expect(items[0]).not.toContain(t("context.memoryAlreadyUsed"));
    expect(items[1]).toContain(t("context.memoryAlreadyUsed"));

    // Each text is marked with its language.
    const codes = memoryList(page).find("li").findAll("abbr");

    expect(codes.map((code) => code.text())).toEqual(["en", "de"]);
    expect(codes.map((code) => code.attributes("title"))).toEqual([
      "English",
      "German",
    ]);

    // The percentage is the English texts', at the end of their line.
    const badge = memoryList(page)
      .findAll("li span")
      .find((span) => span.text() === "100%")!;

    expect(badge.attributes("title")).toBe(
      t("context.memorySimilarity", { language: "English" }),
    );
    expect(badge.element.previousElementSibling!.textContent).toContain(
      "Save your changes",
    );
    expect(badge.element.previousElementSibling!.previousElementSibling).toBe(
      codes[0]!.element,
    );
  });

  it("puts a match into the field, unsaved", async () => {
    const { page } = await openEditor([...VIEWER, "update_entry"]);

    await openMemory(page, "German");
    await vi.waitFor(() => expect(memoryList(page).exists()).toBe(true));

    // The field has the second match's text already.
    expect(useButtons(page)).toHaveLength(1);

    await useButtons(page)[0]!.trigger("click");
    await settle();

    expect(field(page, "l2").element.value).toBe("Änderungen speichern");
    expect(page.iconButtons()).toContain(
      t("common.revertFor", { language: "German" }),
    );
  });

  it("offers nothing to use to those who can't edit", async () => {
    const { page } = await openEditor(VIEWER);

    await openMemory(page, "German");
    await vi.waitFor(() => expect(memoryList(page).exists()).toBe(true));

    expect(useButtons(page)).toHaveLength(0);
  });

  it("asks again once typing in the default text pauses", async () => {
    const { page, searches } = await openEditor([...VIEWER, "update_entry"]);

    await openMemory(page, "German");
    await vi.waitFor(() => expect(searches).toHaveLength(1));

    await field(page, "l1").setValue("Save all changes");
    await vi.waitFor(() => expect(searches).toHaveLength(2));

    expect(searches[1]).toMatchObject({ sourceText: "Save all changes" });
  });

  it("has nothing to show for the default language", async () => {
    const { page, searches } = await openEditor(VIEWER);

    await openMemory(page, "English");

    expect(page.wrapper.text()).toContain(t("context.memoryDefaultHint"));
    expect(searches).toEqual([]);
  });
});
