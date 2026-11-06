import { describe, expect, it } from "vitest";
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
  { id: "l3", code: "fr", name: "French" },
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

async function openEditor(
  localizations = entry.localizations,
  languages: object[] = locales,
) {
  loginAs([...VIEWER, "update_entry"]);
  mockRpc("LocaleService/ListLocales", {
    locales: languages,
    pagination: pagination(languages.length),
  });
  mockRpc("EntryService/ListEntries", {
    entries: [{ ...entry, localizations }],
    pagination: pagination(1),
  });
  mockRpc("EntryService/GetEntry", { entry: { ...entry, localizations } });

  return mountPage(EntriesPage, { route: "/entries?locales=en,de,fr" });
}

const field = (page: MountedPage, localeId: string) =>
  page.wrapper.find<HTMLTextAreaElement>(`textarea[id$="-${localeId}"]`);

const missingName = () =>
  t("entries.suggestionWarning.PLACEHOLDER_MISSING", { placeholder: "{name}" });

describe("checks in the editor", () => {
  it("flags typed text that lost a placeholder, until it is fixed", async () => {
    const page = await openEditor();

    expect(page.wrapper.text()).not.toContain(t("entries.suggestionCheck"));

    await field(page, "l2").setValue("Hallo");
    await settle();
    expect(page.wrapper.text()).toContain(t("entries.suggestionCheck"));
    expect(page.wrapper.text()).toContain(missingName());

    await field(page, "l2").setValue("Hallo {name}");
    await settle();
    expect(page.wrapper.text()).not.toContain(t("entries.suggestionCheck"));
  });

  it("flags saved text too", async () => {
    const page = await openEditor([
      ...entry.localizations,
      { id: "z3", localeId: "l3", translation: "Bonjour" },
    ]);

    expect(page.wrapper.text()).toContain(missingName());
  });

  it("flags the other form of address than the language asks for", async () => {
    const page = await openEditor(entry.localizations, [
      locales[0]!,
      { ...locales[1]!, formality: "FORMALITY_INFORMAL" },
      locales[2]!,
    ]);
    const wrongForm = t("entries.suggestionWarning.FORMALITY", {
      placeholder: "Sie",
    });

    await field(page, "l2").setValue("Hallo {name}, können Sie das prüfen?");
    await settle();
    expect(page.wrapper.text()).toContain(wrongForm);

    await field(page, "l2").setValue("Hallo {name}, kannst du das prüfen?");
    await settle();
    expect(page.wrapper.text()).not.toContain(t("entries.suggestionCheck"));

    // French asks for neither, so either form passes.
    await field(page, "l3").setValue("Bonjour {name}, pouvez-vous vérifier ?");
    await settle();
    expect(page.wrapper.text()).not.toContain(t("entries.suggestionCheck"));
  });
});
