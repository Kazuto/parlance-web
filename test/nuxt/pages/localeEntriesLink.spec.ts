import { describe, expect, it } from "vitest";
import type { VueWrapper } from "@vue/test-utils";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import App from "~/app.vue";
import LocalesPage from "~/pages/locales/index.vue";
import EntriesPage from "~/pages/entries/index.vue";
import EntryFiltersPopover from "~/components/entry/FiltersPopover.vue";
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
  {
    id: "l1",
    code: "en",
    name: "English",
    names: { en: "English" },
    isDefault: true,
  },
  { id: "l2", code: "de", name: "German", names: { en: "German" } },
  { id: "l3", code: "fr", name: "French", names: { en: "French" } },
];

const STORED_LANGUAGES = "parlance-filters.languages";

/**
 * Follows the "open entries" link in the row of the locale with this name. The
 * test app renders router links as stubs that do not navigate on click, so this
 * goes where the link points, as the browser would.
 */
async function followOpenEntries(wrapper: VueWrapper, name: string) {
  const row = wrapper
    .findAll("tr")
    .find((candidate) => candidate.text().includes(name));
  const link = row!.find(`a[aria-label="${t("locales.openEntries")}"]`);

  await useRouter().push(link.attributes("href")!);
  await settle();
}

function mockLocales() {
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
}

describe("opening entries from the locales overview", () => {
  async function openOverview(permissions: readonly string[]) {
    loginAs(permissions);
    mockLocales();
    mockRpc("StatsService/GetStats", {});

    return mountPage(LocalesPage);
  }

  /** Follows the "open entries" link in the row of the locale with this name. */
  async function openEntriesFor(page: MountedPage, name: string) {
    await followOpenEntries(page.wrapper, name);

    return useRouter().currentRoute.value;
  }

  it("is offered for every locale to users who can read entries", async () => {
    const page = await openOverview(VIEWER);

    const actions = page
      .iconButtons()
      .filter((label) => label === t("locales.openEntries"));

    expect(actions).toHaveLength(locales.length);
  });

  it("is a real link, so it can be opened in a new tab", async () => {
    const page = await openOverview(VIEWER);
    const row = page.wrapper
      .findAll("tr")
      .find((candidate) => candidate.text().includes("German"));

    const entries = row!.find(`[aria-label="${t("locales.openEntries")}"]`);

    expect(entries.element.tagName).toBe("A");
    expect(entries.attributes("href")).toBe("/entries?locales=en,de");

    const view = row!.find(`[aria-label="${t("locales.view")}"]`);

    expect(view.element.tagName).toBe("A");
    expect(view.attributes("href")).toBe("/locales/l2");
  });

  it("is not offered without read_entry", async () => {
    const page = await openOverview(["read_locale"]);

    expect(page.iconButtons()).not.toContain(t("locales.openEntries"));
  });

  it("selects the locale next to the default one", async () => {
    const page = await openOverview(VIEWER);
    const route = await openEntriesFor(page, "German");

    expect(route.path).toBe("/entries");
    expect(route.query.locales).toBe("en,de");
  });

  it("selects only the default locale for the default locale", async () => {
    const page = await openOverview(VIEWER);
    const route = await openEntriesFor(page, "English");

    expect(route.query.locales).toBe("en");
  });

  it("leaves the remembered languages alone", async () => {
    localStorage.setItem(STORED_LANGUAGES, JSON.stringify(["fr"]));

    const page = await openOverview(VIEWER);

    await openEntriesFor(page, "German");

    expect(JSON.parse(localStorage.getItem(STORED_LANGUAGES)!)).toEqual(["fr"]);
  });
});

describe("entries page opened with preselected languages", () => {
  const entry = { id: "e1", key: "app.title", scopes: [], localizations: [] };

  async function openEntries(route: string) {
    loginAs(VIEWER);
    mockLocales();
    mockRpc("EntryService/ListEntries", {
      entries: [entry],
      pagination: pagination(1),
    });
    mockRpc("EntryService/GetEntry", { entry });

    return mountPage(EntriesPage, { route });
  }

  /** Names of the languages shown as translation rows, in order. */
  const shownLanguages = (page: MountedPage) =>
    page.wrapper
      .findAll("textarea")
      .filter((field) => !field.element.closest("dialog:not([open])"))
      .map((field) => {
        const code = field.attributes("id")!.split("-").pop();

        return locales.find((locale) => locale.id === code)?.code;
      });

  it("shows the languages from the link", async () => {
    localStorage.setItem(STORED_LANGUAGES, JSON.stringify(["fr"]));

    const page = await openEntries("/entries?locales=en,de");

    expect(shownLanguages(page)).toEqual(["en", "de"]);
  });

  it("does not replace the remembered languages", async () => {
    localStorage.setItem(STORED_LANGUAGES, JSON.stringify(["fr"]));
    await openEntries("/entries?locales=en,de");

    expect(JSON.parse(localStorage.getItem(STORED_LANGUAGES)!)).toEqual(["fr"]);
  });

  it("remembers languages the user picks after opening a link", async () => {
    localStorage.setItem(STORED_LANGUAGES, JSON.stringify(["fr"]));

    const page = await openEntries("/entries?locales=en,de");

    const filters = page.wrapper.findComponent(EntryFiltersPopover);

    filters.vm.$emit("update:localeIds", ["l1", "l3"]);
    await settle();

    expect(JSON.parse(localStorage.getItem(STORED_LANGUAGES)!)).toEqual([
      "en",
      "fr",
    ]);
  });

  it("still uses the remembered languages without a link", async () => {
    localStorage.setItem(STORED_LANGUAGES, JSON.stringify(["fr"]));

    const page = await openEntries("/entries");

    expect(shownLanguages(page)).toEqual(["fr"]);
  });
});

describe("translation status on the locales overview", () => {
  async function openOverview(permissions: readonly string[]) {
    loginAs(permissions);
    mockLocales();
    mockRpc("StatsService/GetStats", {
      byLocale: [
        { localeId: "l1", percentage: 100 },
        { localeId: "l2", percentage: 80 },
        { localeId: "l3", percentage: 0 },
      ],
    });

    return mountPage(LocalesPage);
  }

  /** The status cell of the locale with this name. */
  function statusOf(page: MountedPage, name: string) {
    const row = page.wrapper
      .findAll("tr")
      .find((candidate) => candidate.text().includes(name))!;

    return row.find("td:nth-child(3)");
  }

  it("links to the missing translations while some are missing", async () => {
    const page = await openOverview(VIEWER);
    const link = statusOf(page, "German").find("a");

    expect(link.text()).toBe("80%");
    expect(link.attributes("href")).toBe(
      "/entries?locales=en,de&status=missing",
    );
    expect(link.attributes("aria-label")).toBe(
      `${t("locales.showMissing")} (80%)`,
    );
  });

  it("links to all entries once nothing is missing", async () => {
    const page = await openOverview(VIEWER);
    const link = statusOf(page, "English").find("a");

    expect(link.attributes("href")).toBe("/entries?locales=en");
    expect(link.attributes("aria-label")).toBe(
      `${t("locales.showEntries")} (100%)`,
    );
  });

  it("shows the status without a link to users who cannot read entries", async () => {
    const page = await openOverview(["read_locale"]);
    const status = statusOf(page, "German");

    expect(status.text()).toBe("80%");
    expect(status.find("a").exists()).toBe(false);
  });

  it("opens the entries filtered to what is missing", async () => {
    const page = await openOverview(VIEWER);

    await useRouter().push(
      statusOf(page, "French").find("a").attributes("href")!,
    );
    await settle();

    const route = useRouter().currentRoute.value;

    expect(route.query).toEqual({ locales: "en,fr", status: "missing" });
  });
});

// Clicks through the real app, as a user would: the entries page then starts with
// the locale list the locales page cached, before loading its own.
describe("from the locales overview to the entries, through the app", () => {
  async function openApp() {
    loginAs(VIEWER);
    mockLocales();
    mockRpc("StatsService/GetStats", {});

    const entry = { id: "e1", key: "app.title", scopes: [], localizations: [] };

    mockRpc("EntryService/ListEntries", {
      entries: [entry],
      pagination: pagination(1),
    });
    mockRpc("EntryService/GetEntry", { entry });

    const app = await mountSuspended(App, { route: "/locales" });

    await settle();

    return app;
  }

  async function clickOpenEntries(
    app: Awaited<ReturnType<typeof openApp>>,
    name: string,
  ) {
    await followOpenEntries(app, name);
    await settle();
  }

  it("keeps the remembered languages", async () => {
    localStorage.setItem(STORED_LANGUAGES, JSON.stringify(["fr"]));

    const app = await openApp();

    await clickOpenEntries(app, "German");

    expect(useRouter().currentRoute.value.fullPath).toBe(
      "/entries?locales=en,de",
    );
    expect(JSON.parse(localStorage.getItem(STORED_LANGUAGES)!)).toEqual(["fr"]);
  });

  it("keeps the remembered languages when there are none yet", async () => {
    const app = await openApp();

    await clickOpenEntries(app, "German");

    expect(useRouter().currentRoute.value.fullPath).toBe(
      "/entries?locales=en,de",
    );
    expect(JSON.parse(localStorage.getItem(STORED_LANGUAGES) ?? "[]")).toEqual(
      [],
    );
  });
});
