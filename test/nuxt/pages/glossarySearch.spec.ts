import { describe, expect, it } from "vitest";
import { SplitView } from "@thkzt/eunoia";
import GlossaryPage from "~/pages/glossary/index.vue";
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

async function openGlossary(terminologies: object[] = []) {
  const requests: ListRequest[] = [];

  loginAs(VIEWER);
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
  mockRpc("TerminologyService/ListTerminologies", (body) => {
    requests.push(body as ListRequest);

    return { terminologies, pagination: pagination(terminologies.length) };
  });

  const page = await mountPage(GlossaryPage);

  return { page, requests };
}

describe("glossary search", () => {
  it("types out a real term as an example search", async () => {
    const { page } = await openGlossary([
      // The same in every language, so it shows nothing new.
      {
        id: "g0",
        term: "API",
        definitions: [{ id: "d0", localeId: "l2", translation: "API" }],
      },
      {
        id: "g1",
        term: "Workspace",
        definitions: [
          { id: "d1", localeId: "l1", translation: "Workspace" },
          { id: "d2", localeId: "l2", translation: "Arbeitsbereich" },
        ],
      },
    ]);
    const input = page.wrapper.find('input[type="search"]');

    await new Promise((resolve) => setTimeout(resolve, 400));
    await settle();

    const placeholder = input.attributes("placeholder") ?? "";

    expect(placeholder.length).toBeGreaterThan(0);
    expect("Workspace".startsWith(placeholder)).toBe(true);
    // The examples only show; the name says what can be searched.
    expect(input.attributes("aria-label")).toBe(t("terminologies.search"));
  });

  it("describes the search while there are no examples", async () => {
    const { page } = await openGlossary();
    const input = page.wrapper.find('input[type="search"]');

    expect(input.attributes("placeholder")).toBe(t("terminologies.search"));
  });

  it("searches in the languages shown in the glossary", async () => {
    // The glossary shows the languages last picked here or on the entries page.
    localStorage.setItem(
      "parlance-filters.languages",
      JSON.stringify(["en", "de"]),
    );

    const { page, requests } = await openGlossary();

    await page.wrapper.find('input[type="search"]').setValue("arbeits");
    // The search waits for typing to pause.
    await new Promise((resolve) => setTimeout(resolve, 400));
    await settle();

    const last = requests.at(-1)!;

    expect(last.filter?.search).toBe("arbeits");
    expect([...(last.targetLocaleIds ?? [])].sort()).toEqual(["l1", "l2"]);
  });
});

describe("glossary list", () => {
  it("loads more terms as the list scrolls", async () => {
    const requests: { pagination?: { page?: number } }[] = [];

    loginAs(VIEWER);
    mockRpc("LocaleService/ListLocales", {
      locales,
      pagination: pagination(locales.length),
    });
    mockRpc("TerminologyService/ListTerminologies", (body) => {
      const request = body as { pagination?: { page?: number } };

      requests.push(request);

      const page = request.pagination?.page ?? 1;

      return {
        terminologies: [{ id: `g${page}`, term: `Term ${page}` }],
        pagination: { page, perPage: 1, total: 2, totalPages: 2 },
      };
    });

    const page = await mountPage(GlossaryPage);

    page.wrapper.findComponent(SplitView).vm.$emit("end-reached");
    await settle();

    // The first page loads again once the languages arrive; then comes the next.
    expect(requests.at(-1)?.pagination?.page).toBe(2);

    // The list is virtual, so check what it was given rather than what it drew.
    const items = page.wrapper.findComponent(SplitView).props("items") as {
      label: string;
    }[];

    expect(items.map((item) => item.label)).toEqual(["Term 1", "Term 2"]);
  });
});
