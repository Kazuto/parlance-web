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
    {
      id: "z1",
      localeId: "l1",
      translation: "Hello",
      status: "REVIEW_STATUS_APPROVED",
    },
    {
      id: "z2",
      localeId: "l2",
      translation: "Hallo",
      status: "REVIEW_STATUS_DRAFT",
    },
    {
      id: "z3",
      localeId: "l3",
      translation: "Bonjour",
      status: "REVIEW_STATUS_DRAFT",
      reviewComment: "Too formal",
    },
  ],
};

type ReviewRequest = {
  entryIds?: string[];
  localeIds?: string[];
  decision?: string;
  comment?: string;
};

async function openEditor(
  permissions: readonly string[],
  route = "/entries?locales=en,de,fr",
) {
  const reviews: ReviewRequest[] = [];
  const lists: { translationStatus?: string }[] = [];

  loginAs(permissions);
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
  mockRpc("EntryService/ListEntries", (body) => {
    lists.push(body);

    return { entries: [entry], pagination: pagination(1) };
  });
  mockRpc("EntryService/GetEntry", { entry });
  mockRpc("LocalizationService/ReviewLocalizations", (body) => {
    reviews.push(body as ReviewRequest);

    return { localizations: [entry.localizations[1]] };
  });

  const page = await mountPage(EntriesPage, { route });

  return { page, reviews, lists };
}

const REVIEWER = [...VIEWER, "update_entry", "review_entry"];

function reviewButton(page: MountedPage, label: string) {
  return page.wrapper.find(`button[aria-label="${label}"]`);
}

describe("reviewing translations in the editor", () => {
  it("shows each language's review state", async () => {
    const { page } = await openEditor(VIEWER);
    const text = page.wrapper.text();

    expect(text).toContain(t("review.draft"));
    expect(text).toContain(t("review.rejected"));
    // Approving needs review_entry.
    expect(page.iconButtons()).not.toContain(
      t("review.approveFor", { language: "German" }),
    );
  });

  it("approves a draft", async () => {
    const { page, reviews } = await openEditor(REVIEWER);

    await reviewButton(
      page,
      t("review.approveFor", { language: "German" }),
    ).trigger("click");
    await settle();

    expect(reviews).toEqual([
      {
        entryIds: ["e1"],
        localeIds: ["l2"],
        decision: "REVIEW_DECISION_APPROVE",
      },
    ]);
  });

  it("offers no review for approved text", async () => {
    const { page } = await openEditor(REVIEWER);

    expect(page.iconButtons()).not.toContain(
      t("review.approveFor", { language: "English" }),
    );
  });

  it("sends a draft back with a comment", async () => {
    const { page, reviews } = await openEditor(REVIEWER);

    await reviewButton(
      page,
      t("review.rejectFor", { language: "German" }),
    ).trigger("click");
    await settle();

    const dialog = page.wrapper.find("dialog[open]");

    await dialog.find("textarea").setValue("Use du");
    await dialog.find("form").trigger("submit");
    await settle();

    expect(reviews).toEqual([
      {
        entryIds: ["e1"],
        localeIds: ["l2"],
        decision: "REVIEW_DECISION_REJECT",
        comment: "Use du",
      },
    ]);
  });

  it("lists the entries that need review", async () => {
    const { lists } = await openEditor(
      VIEWER,
      "/entries?locales=en,de&status=review",
    );

    expect(lists.at(-1)?.translationStatus).toBe("review");
  });
});
