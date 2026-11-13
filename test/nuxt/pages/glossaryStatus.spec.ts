import { describe, expect, it } from "vitest";
import { Chip } from "@thkzt/eunoia";
import GlossaryPage from "~/pages/glossary/index.vue";
import TerminologyFiltersPopover from "~/components/terminology/FiltersPopover.vue";
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

const STORED = "parlance-filters.glossary";

type ListRequest = {
  targetLocaleIds?: string[];
  translationStatus?: string;
};

async function openGlossary(route = "/glossary") {
  const requests: ListRequest[] = [];
  const terminologies = [{ id: "g1", term: "Workspace" }];

  loginAs(VIEWER);
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
  mockRpc("TerminologyService/ListTerminologies", (body) => {
    requests.push(body as ListRequest);

    return { terminologies, pagination: pagination(terminologies.length) };
  });

  const page = await mountPage(GlossaryPage, { route, attach: true });

  return { page, requests };
}

const statusChip = (page: MountedPage, label: string) =>
  page.wrapper.findAllComponents(Chip).find((chip) => chip.text() === label);

async function openFilters(page: MountedPage) {
  await page.wrapper
    .findAll("button")
    .find((button) => button.text().startsWith(t("common.filters")))!
    .trigger("click");
  await settle();
}

// The panel renders at the end of the page.
const filtersPanel = () =>
  document.querySelector(`[role="dialog"][aria-label="${t("common.filters")}"]`)
    ?.textContent ?? "";

const query = () => useRouter().currentRoute.value.query;

describe("glossary status filter", () => {
  it("lists the terms of a link's status in the shown languages", async () => {
    localStorage.setItem(
      "parlance-filters.languages",
      JSON.stringify(["en", "de"]),
    );

    const { page, requests } = await openGlossary("/glossary?status=review");

    expect(requests.at(-1)?.translationStatus).toBe("review");
    // The default language counts like the others.
    expect([...(requests.at(-1)?.targetLocaleIds ?? [])].sort()).toEqual([
      "l1",
      "l2",
    ]);

    statusChip(page, t("entries.filterReview"))!.vm.$emit("remove");
    await settle();

    expect(requests.at(-1)).not.toHaveProperty("translationStatus");
    expect(query()).not.toHaveProperty("status");
    expect(statusChip(page, t("entries.filterReview"))).toBeUndefined();
  });

  it("filters by the status picked in the filters", async () => {
    const { page, requests } = await openGlossary();

    expect(requests.at(-1)).not.toHaveProperty("translationStatus");

    await openFilters(page);
    // The help says the default language is checked too, unlike for entries.
    expect(filtersPanel()).toContain(t("terminologies.filterSelectedHelp"));

    page.wrapper
      .findComponent(TerminologyFiltersPopover)
      .vm.$emit("update:status", "missing");
    await settle();

    expect(requests.at(-1)?.translationStatus).toBe("missing");
    expect(query()).toMatchObject({ status: "missing" });
    expect(statusChip(page, t("entries.missingTranslations"))?.exists()).toBe(
      true,
    );
    expect(JSON.parse(localStorage.getItem(STORED) ?? "{}")).toEqual({
      status: "missing",
    });
  });

  it("clears the status with the other filters", async () => {
    const { page, requests } = await openGlossary("/glossary?status=complete");

    await openFilters(page);
    page.wrapper.findComponent(TerminologyFiltersPopover).vm.$emit("clear");
    await settle();

    expect(requests.at(-1)).not.toHaveProperty("translationStatus");
    expect(query()).not.toHaveProperty("status");
  });

  it("brings back the status last picked here", async () => {
    localStorage.setItem(STORED, JSON.stringify({ status: "review" }));

    const { requests } = await openGlossary();

    expect(requests.at(-1)?.translationStatus).toBe("review");
    expect(query()).toMatchObject({ status: "review" });
  });

  it("shows every match of a link's search, whatever status was stored", async () => {
    localStorage.setItem(STORED, JSON.stringify({ status: "review" }));

    const { requests } = await openGlossary("/glossary?q=Workspace");

    expect(requests.at(-1)).not.toHaveProperty("translationStatus");
    // Opening a link doesn't replace the stored status.
    expect(JSON.parse(localStorage.getItem(STORED) ?? "{}")).toEqual({
      status: "review",
    });
  });

  it("ignores an unknown status in a link", async () => {
    // Entries can be outdated; definitions can't.
    const { requests } = await openGlossary("/glossary?status=outdated");

    expect(requests.at(-1)).not.toHaveProperty("translationStatus");
    expect(query()).not.toHaveProperty("status");
  });
});
