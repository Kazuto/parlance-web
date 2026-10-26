import { describe, expect, it } from "vitest";
import DashboardPage from "~/pages/index.vue";
import { VIEWER, loginAs, mockRpc, mountPage, pagination, t } from "./helpers";

// German waits for review, misses two entries and has an outdated one; English is
// done; "tlh-x" has no name the browser knows.
const stats = {
  totalEntries: 10,
  byLocale: [
    {
      localeId: "l2",
      localeCode: "de",
      completed: 8,
      approved: 5,
      drafts: 3,
      missing: 2,
      outdated: 1,
      percentage: 80,
    },
    {
      localeId: "l1",
      localeCode: "en",
      completed: 10,
      approved: 10,
      drafts: 0,
      missing: 0,
      percentage: 100,
    },
    {
      localeId: "l3",
      localeCode: "tlh-x",
      completed: 0,
      approved: 0,
      drafts: 0,
      missing: 10,
      percentage: 0,
    },
  ],
};

async function openDashboard(permissions: readonly string[] = VIEWER) {
  loginAs(permissions);
  mockRpc("StatsService/GetStats", stats);
  mockRpc("LocaleService/ListLocales", {
    locales: [
      { id: "l1", code: "en", isDefault: true },
      { id: "l2", code: "de" },
      { id: "l3", code: "tlh-x" },
    ],
    pagination: pagination(3),
  });

  const page = await mountPage(DashboardPage);
  const list = page.wrapper.find(
    `ul[aria-label="${t("dashboard.languageProgress")}"]`,
  );

  return { page, list };
}

describe("progress by language", () => {
  it("shows each language's approved, waiting and missing translations", async () => {
    const { list } = await openDashboard();
    const rows = list.findAll("li").map((row) => row.text());

    // In the order of their names; a code without one stands for itself.
    expect(rows.map((row) => row.split(/\s/)[0])).toEqual([
      "English",
      "German",
      "tlh-x",
    ]);
    expect(rows[1]).toContain("80%");
    expect(rows[1]).toContain(t("dashboard.progressApproved", { count: "5" }));
    expect(rows[1]).toContain(t("dashboard.progressDrafts", { count: "3" }));
    expect(rows[1]).toContain(t("dashboard.progressMissing", { count: "2" }));
    expect(rows[1]).toContain(t("dashboard.progressOutdated", { count: "1" }));
    // Only languages with outdated translations mention them.
    expect(rows[0]).not.toContain(
      t("dashboard.progressOutdated", { count: "0" }),
    );
  });

  it("opens the entries that need work in that language", async () => {
    const { list } = await openDashboard();
    const links = list.findAll("a").map((link) => link.attributes("href"));

    // English has nothing to review or add, so it links nowhere. The others open
    // next to English, the default language, to compare with the source.
    expect(links).toEqual([
      "/entries?locales=en,de&status=review",
      "/entries?locales=en,de&status=missing",
      "/entries?locales=en,de&status=outdated",
      "/entries?locales=en,tlh-x&status=missing",
    ]);
  });

  it("needs read_entry", async () => {
    const { list } = await openDashboard(["read_locale"]);

    expect(list.exists()).toBe(false);
  });
});
