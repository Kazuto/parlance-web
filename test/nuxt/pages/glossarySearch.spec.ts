import { describe, expect, it } from "vitest";
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

async function openGlossary() {
  const requests: ListRequest[] = [];
  loginAs(VIEWER);
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
  mockRpc("TerminologyService/ListTerminologies", (body) => {
    requests.push(body as ListRequest);
    return { terminologies: [], pagination: pagination(0) };
  });
  const page = await mountPage(GlossaryPage);
  return { page, requests };
}

describe("glossary search", () => {
  it("says it searches translations too", async () => {
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
