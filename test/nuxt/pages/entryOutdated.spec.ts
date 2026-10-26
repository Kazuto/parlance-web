import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { SplitView } from "@thkzt/eunoia";
import ListItem from "~/components/editor/ListItem.vue";
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

const OUTDATED_AT = "2026-10-01T10:00:00.123456Z";

// The English text changed from "Hello" to "Hi" after the German was approved;
// the French draft was written for "Hi".
const entry = {
  id: "e1",
  key: "greeting",
  scopes: [],
  outdatedLocaleIds: ["l2"],
  localizations: [
    {
      id: "z1",
      localeId: "l1",
      translation: "Hi",
      status: "REVIEW_STATUS_APPROVED",
    },
    {
      id: "z2",
      localeId: "l2",
      translation: "Hallo",
      status: "REVIEW_STATUS_APPROVED",
      outdated: true,
      outdatedAt: OUTDATED_AT,
    },
    {
      id: "z3",
      localeId: "l3",
      translation: "Salut",
      status: "REVIEW_STATUS_DRAFT",
    },
  ],
};

type Request = Record<string, unknown>;

async function openEditor(
  permissions: readonly string[] = VIEWER,
  { before = "Hello", route = "/entries?locales=en,de,fr" } = {},
) {
  const lists: Request[] = [];
  const histories: Request[] = [];
  const reviews: Request[] = [];

  loginAs(permissions);
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
  mockRpc("EntryService/ListEntries", (body) => {
    lists.push(body as Request);

    return { entries: [entry], pagination: pagination(1) };
  });
  mockRpc("EntryService/GetEntry", { entry });
  mockRpc("EntryService/GetEntryHistory", (body) => {
    histories.push(body as Request);

    return {
      history: before
        ? [{ id: "h1", localeId: "l1", translation: before, action: "created" }]
        : [],
      pagination: pagination(before ? 1 : 0),
    };
  });
  mockRpc("LocalizationService/ReviewLocalizations", (body) => {
    reviews.push(body as Request);

    return { localizations: [entry.localizations[1]] };
  });

  const page = await mountPage(EntriesPage, { route });

  return { page, lists, histories, reviews };
}

const REVIEWER = [...VIEWER, "update_entry", "review_entry"];

const button = (page: MountedPage, label: string) =>
  page.wrapper.find(`button[aria-label="${label}"]`);

const sourceChange = (page: MountedPage) =>
  page.wrapper.find(
    `section[aria-label="${t("context.sourceChanged", { language: "English" })}"]`,
  );

describe("outdated translations in the editor", () => {
  it("marks the languages whose default text changed", async () => {
    const { page } = await openEditor();
    const tag = (language: string) =>
      button(page, t("review.showChangeFor", { language }));

    expect(tag("German").exists()).toBe(true);
    expect(tag("German").text()).toBe(t("review.outdated"));
    expect(tag("French").exists()).toBe(false);
    expect(tag("English").exists()).toBe(false);
  });

  it("shows how the default text changed", async () => {
    const { page, histories } = await openEditor();

    await button(
      page,
      t("review.showChangeFor", { language: "German" }),
    ).trigger("click");
    await settle();

    // The last English text before the German was marked.
    expect(histories).toContainEqual({
      entryId: "e1",
      localeId: "l1",
      before: OUTDATED_AT,
      pagination: { page: 1, perPage: 1 },
    });

    const change = sourceChange(page);

    expect(change.text()).toContain(t("context.sourceBefore"));
    expect(change.text()).toContain("Hello");
    expect(change.text()).toContain(t("context.sourceNow"));
    expect(change.text()).toContain("Hi");
  });

  it("says when there was no default text before", async () => {
    const { page } = await openEditor(VIEWER, { before: "" });

    await button(
      page,
      t("review.showChangeFor", { language: "German" }),
    ).trigger("click");
    await settle();

    expect(sourceChange(page).text()).toContain(t("context.sourceBeforeNone"));
  });

  it("shows no change for a current translation", async () => {
    const { page, histories } = await openEditor();

    await button(page, t("context.openFor", { language: "French" })).trigger(
      "click",
    );
    await settle();

    expect(sourceChange(page).exists()).toBe(false);
    expect(histories).toEqual([]);
  });

  it("lets a reviewer confirm an approved translation still fits", async () => {
    const { page, reviews } = await openEditor(REVIEWER);
    const confirm = button(
      page,
      t("review.confirmFor", { language: "German" }),
    );

    await confirm.trigger("click");
    await settle();

    expect(reviews).toEqual([
      {
        entryIds: ["e1"],
        localeIds: ["l2"],
        decision: "REVIEW_DECISION_APPROVE",
        confirmOutdated: true,
      },
    ]);
  });

  it("needs review_entry to confirm", async () => {
    const { page } = await openEditor([...VIEWER, "update_entry"]);

    expect(
      button(page, t("review.confirmFor", { language: "German" })).exists(),
    ).toBe(false);
  });

  it("filters for outdated translations", async () => {
    const { page, lists } = await openEditor(VIEWER, {
      route: "/entries?locales=en,de,fr&status=outdated",
    });

    expect(lists.at(-1)).toMatchObject({ translationStatus: "outdated" });
    // The list counts them per entry.
    expect(
      page.wrapper.findComponent(SplitView).props("items")[0],
    ).toMatchObject({ outdatedLocaleIds: ["l2"] });
  });
});

describe("check warnings filter", () => {
  it("filters for translations the checks flag", async () => {
    const { lists } = await openEditor(VIEWER, {
      route: "/entries?locales=en,de,fr&status=check",
    });

    expect(lists.at(-1)).toMatchObject({ translationStatus: "check" });
  });
});

describe("outdated count in the entry list", () => {
  it("shows how many shown languages are outdated", async () => {
    const label = t("review.outdatedCount", { count: 2 });
    const wrapper = await mountSuspended(ListItem, {
      props: {
        label: "greeting",
        missingCount: 0,
        missingLabel: "",
        outdatedCount: 2,
        outdatedLabel: label,
      },
    });

    expect(wrapper.find(`[aria-label="${label}"]`).text()).toBe("2");
  });
});
