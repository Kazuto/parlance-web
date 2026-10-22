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
} from "../helpers";

const locales = [
  { id: "l1", code: "en", name: "English", isDefault: true },
  { id: "l2", code: "de", name: "German" },
  { id: "l3", code: "fr", name: "French" },
];

type ListRequest = {
  filter?: { search?: string };
  targetLocaleIds?: string[];
};

async function openEntries(route: string, entries: object[] = []) {
  const requests: ListRequest[] = [];
  loginAs(VIEWER);
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
  mockRpc("EntryService/ListEntries", (body) => {
    requests.push(body as ListRequest);
    return { entries, pagination: pagination(entries.length) };
  });
  const page = await mountPage(EntriesPage, { route });
  return { page, requests };
}

describe("entry search", () => {
  it("types out a real key as an example search", async () => {
    const { page } = await openEntries("/entries", [
      { id: "e1", key: "auth.signIn", defaultTranslation: "Sign in" },
      { id: "e2", key: "app.title", defaultTranslation: "Parlance" },
    ]);
    const input = page.wrapper.find('input[type="search"]');
    await new Promise((resolve) => setTimeout(resolve, 400));
    await settle();

    const placeholder = input.attributes("placeholder") ?? "";
    expect(placeholder.length).toBeGreaterThan(0);
    expect("auth.signIn".startsWith(placeholder)).toBe(true);
    // The examples only show; the name says what can be searched.
    expect(input.attributes("aria-label")).toBe(t("entries.search"));
  });

  it("describes the search while there are no examples", async () => {
    const { page } = await openEntries("/entries");
    const input = page.wrapper.find('input[type="search"]');

    expect(input.attributes("placeholder")).toBe(t("entries.search"));
  });

  it("searches in the languages shown in the editor", async () => {
    const { page, requests } = await openEntries("/entries?locales=en,de");

    await page.wrapper.find('input[type="search"]').setValue("hallo");
    // The search waits for typing to pause.
    await new Promise((resolve) => setTimeout(resolve, 400));
    await settle();

    const last = requests.at(-1)!;
    expect(last.filter?.search).toBe("hallo");
    expect([...(last.targetLocaleIds ?? [])].sort()).toEqual(["l1", "l2"]);
  });
});
