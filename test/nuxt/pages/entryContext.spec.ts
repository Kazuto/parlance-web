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
  { id: "l3", code: "ar", name: "Arabic" },
];

const entry = {
  id: "e1",
  key: "greeting",
  scopes: [],
  localizations: [
    { id: "z1", localeId: "l1", translation: "Hello {name}" },
    { id: "z2", localeId: "l2", translation: "Hallo {name}" },
  ],
};

async function openEditor(permissions: readonly string[]) {
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
  mockRpc("EntryService/GetEntryHistory", {
    history: [
      {
        id: "h2",
        localeId: "l2",
        translation: "Hallo {name}",
        action: "updated",
        changedAt: "2026-10-20T10:00:00Z",
      },
      {
        id: "h1",
        localeId: "l2",
        translation: "Servus {name}",
        action: "created",
        changedAt: "2026-10-19T10:00:00Z",
      },
    ],
    pagination: { ...pagination(2), totalPages: 1 },
  });

  return mountPage(EntriesPage, {
    route: "/entries?locales=en,de,ar",
    attach: true,
  });
}

const field = (page: MountedPage, localeId: string) =>
  page.wrapper.find<HTMLTextAreaElement>(`#entry-e1-${localeId}`);

async function openGermanHistory(page: MountedPage) {
  await page.wrapper
    .find(
      `button[aria-label="${t("context.openFor", { language: "German" })}"]`,
    )
    .trigger("click");
  await settle();
  await page.wrapper
    .findAll('[role="tab"]')
    .find((tab) => tab.text().includes(t("context.history")))!
    .trigger("click");
  await settle();
}

const useButtons = (page: MountedPage) =>
  page.wrapper.findAll(`button[aria-label="${t("context.useVersion")}"]`);

describe("history in the editor", () => {
  it("puts an older text back into the field, unsaved", async () => {
    const page = await openEditor([...VIEWER, "update_entry"]);

    await openGermanHistory(page);

    // The current text needs no button.
    expect(useButtons(page)).toHaveLength(1);

    await useButtons(page)[0]!.trigger("click");
    await settle();

    expect(field(page, "l2").element.value).toBe("Servus {name}");
    expect(page.iconButtons()).toContain(
      t("common.revertFor", { language: "German" }),
    );
  });

  it("offers nothing to put back to those who can't edit", async () => {
    const page = await openEditor(VIEWER);

    await openGermanHistory(page);

    expect(page.wrapper.text()).toContain("Servus {name}");
    expect(useButtons(page)).toHaveLength(0);
  });
});

describe("glossary in the editor", () => {
  it("shows the default text above what the glossary found", async () => {
    const page = await openEditor(VIEWER);

    await page.wrapper
      .find(
        `button[aria-label="${t("context.openFor", { language: "German" })}"]`,
      )
      .trigger("click");
    await settle();

    const text = () => page.wrapper.text();

    await vi.waitFor(() => expect(text()).toContain(t("context.noTerms")));

    const source = text().indexOf(t("context.source", { language: "English" }));

    expect(source).toBeGreaterThan(-1);
    expect(text().indexOf("Hello {name}", source)).toBeLessThan(
      text().indexOf(t("context.noTerms")),
    );
  });
});

describe("writing direction in the editor", () => {
  it("writes each language in its direction", async () => {
    const page = await openEditor(VIEWER);

    expect(field(page, "l1").attributes("dir")).toBe("ltr");
    expect(field(page, "l3").attributes("dir")).toBe("rtl");
  });
});
