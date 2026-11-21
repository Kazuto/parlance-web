import { describe, expect, it } from "vitest";
import { ConfirmDialog, SplitView } from "@thkzt/eunoia";
import EntriesPage from "~/pages/entries/index.vue";
import {
  VIEWER,
  loginAs,
  mockRpc,
  mountPage,
  openActionMenu,
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

const approved = "REVIEW_STATUS_APPROVED";

// e1 has a German draft, e2 an approved German text, e3 no English to copy.
const entries = [
  {
    id: "e1",
    key: "greeting",
    scopes: [],
    localizations: [
      { id: "z1", localeId: "l1", translation: "Hello", status: approved },
      { id: "z2", localeId: "l2", translation: "Hallo" },
    ],
  },
  {
    id: "e2",
    key: "farewell",
    scopes: [],
    localizations: [
      { id: "z3", localeId: "l1", translation: "Bye", status: approved },
      { id: "z4", localeId: "l2", translation: "Tschüss", status: approved },
    ],
  },
  {
    id: "e3",
    key: "thanks",
    scopes: [],
    localizations: [
      { id: "z5", localeId: "l2", translation: "Danke", status: approved },
    ],
  },
];

const EVERYTHING = [...VIEWER, "update_entry", "review_entry", "delete_entry"];

async function openWithTicked(
  permissions: readonly string[] = EVERYTHING,
  route = "/entries?locales=en,de,fr",
) {
  const reviews: Record<string, unknown>[] = [];
  const retranslates: Record<string, unknown>[] = [];
  const deletes: { ids?: string[] }[] = [];
  const deleted = new Set<string>();

  loginAs(permissions);
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
  mockRpc("EntryService/ListEntries", () => {
    const remaining = entries.filter((entry) => !deleted.has(entry.id));

    return { entries: remaining, pagination: pagination(remaining.length) };
  });
  mockRpc("EntryService/GetEntry", (body) => ({
    entry: entries.find((entry) => entry.id === body.id),
  }));
  mockRpc("LocalizationService/ReviewLocalizations", (body) => {
    reviews.push(body);

    return { localizations: [entries[0]!.localizations[1]] };
  });
  mockRpc("LocalizationService/RetranslateLocalizations", (body) => {
    retranslates.push(body);

    // German has two to mark, French one.
    return { count: body.localeId === "l2" ? 2 : 1, pending: 0 };
  });
  mockRpc("EntryService/DeleteEntries", (body) => {
    const request = body as { ids?: string[] };

    deletes.push(request);
    request.ids?.forEach((id) => deleted.add(id));

    return { deletedCount: request.ids?.length };
  });

  const page = await mountPage(EntriesPage, { route });

  // The list is virtualized and renders no rows here, so tick through it.
  page.wrapper
    .findComponent(SplitView)
    .vm.$emit("update:selection", ["e1", "e2", "e3"]);
  await settle();

  return { page, reviews, retranslates, deletes };
}

const moreActions = (page: MountedPage) =>
  openActionMenu(page, t("common.moreActions"));

async function choose(page: MountedPage, label: string) {
  const action = (await moreActions(page)).find(
    (entry) => entry.label === label,
  );

  await action!.item.trigger("click");
  await settle();
}

const field = (page: MountedPage, localeId: string) =>
  page.wrapper.find<HTMLTextAreaElement>(`textarea[id$="-${localeId}"]`);

describe("more actions for ticked entries", () => {
  it("offers what the user may do", async () => {
    const labels = async (permissions: readonly string[]) => {
      const { page } = await openWithTicked(permissions);
      const result = (await moreActions(page)).map((entry) => entry.label);

      page.wrapper.unmount();

      return result;
    };

    expect(await labels(EVERYTHING)).toEqual([
      t("review.rejectTicked"),
      t("review.confirmOutdatedTicked"),
      t("entries.copyDefaultToEmpty"),
      t("entries.bulkDelete"),
    ]);
    expect(
      await labels([
        ...VIEWER,
        "update_entry",
        "review_entry",
        "use_machine_translation",
      ]),
    ).toEqual([
      t("review.rejectTicked"),
      t("review.confirmOutdatedTicked"),
      t("entries.retranslateTicked"),
      t("entries.copyDefaultToEmpty"),
    ]);
    expect(await labels([...VIEWER, "review_entry"])).toEqual([
      t("review.rejectTicked"),
      t("review.confirmOutdatedTicked"),
    ]);
    expect(await labels([...VIEWER, "delete_entry"])).toEqual([
      t("entries.bulkDelete"),
    ]);
    expect(await labels(VIEWER)).toEqual([]);
  });

  it("approves the drafts, leaving outdated translations to confirm", async () => {
    const { page, reviews } = await openWithTicked();

    await page.wrapper
      .findAll("button")
      .find((button) => button.text() === t("review.approveTicked"))!
      .trigger("click");
    await settle();

    expect(reviews).toEqual([
      {
        entryIds: ["e1", "e2", "e3"],
        localeIds: ["l1", "l2", "l3"],
        decision: "REVIEW_DECISION_APPROVE",
      },
    ]);
  });

  it("confirms the outdated translations once confirmed in a dialog", async () => {
    const { page, reviews } = await openWithTicked();

    await choose(page, t("review.confirmOutdatedTicked"));

    const dialog = page.wrapper.find("dialog[open]");

    expect(dialog.text()).toContain(t("review.confirmOutdatedTitle"));
    expect(dialog.text()).toContain(
      t("review.confirmOutdatedMessage", { count: 3 }, 3),
    );
    expect(reviews).toEqual([]);

    await dialog
      .findAll("button")
      .find((button) => button.text() === t("review.confirmOutdatedAction"))!
      .trigger("click");
    await settle();

    // Only the approved, outdated ones; drafts wait for their own review.
    expect(reviews).toEqual([
      {
        entryIds: ["e1", "e2", "e3"],
        localeIds: ["l1", "l2", "l3"],
        decision: "REVIEW_DECISION_APPROVE",
        onlyOutdated: true,
      },
    ]);
    expect(page.wrapper.find("dialog[open]").exists()).toBe(false);
  });

  it("confirms nothing when the dialog is cancelled", async () => {
    const { page, reviews } = await openWithTicked();

    await choose(page, t("review.confirmOutdatedTicked"));
    await page.wrapper
      .find("dialog[open]")
      .findAll("button")
      .find((button) => button.text() === t("common.cancel"))!
      .trigger("click");
    await settle();

    expect(reviews).toEqual([]);
    expect(page.wrapper.find("dialog[open]").exists()).toBe(false);
  });

  it("sends back the drafts with a comment, leaving approved texts", async () => {
    const { page, reviews } = await openWithTicked();

    await choose(page, t("review.rejectTicked"));

    const dialog = page.wrapper.find("dialog[open]");

    expect(dialog.text()).toContain(
      t("review.rejectTickedTitle", { count: 3 }),
    );

    await dialog.find("textarea").setValue("Check the tone");
    await dialog.find("form").trigger("submit");
    await settle();

    expect(reviews).toEqual([
      {
        entryIds: ["e1", "e2", "e3"],
        localeIds: ["l1", "l2", "l3"],
        decision: "REVIEW_DECISION_REJECT",
        comment: "Check the tone",
        skipApproved: true,
      },
    ]);
    expect(page.wrapper.find("dialog[open]").exists()).toBe(false);
  });

  it("deletes the ticked entries once confirmed", async () => {
    const { page, deletes } = await openWithTicked();

    await choose(page, t("entries.bulkDelete"));

    const dialog = page.wrapper
      .findAllComponents(ConfirmDialog)
      .find((confirm) => confirm.props("open"))!;

    expect(dialog.props("title")).toBe(
      t("entries.bulkDeleteTitle", { count: 3 }),
    );
    expect(deletes).toEqual([]);
    expect(page.wrapper.text()).toContain(
      t("entries.bulkSelected", { count: 3 }),
    );

    dialog.vm.$emit("confirm");
    await settle();

    expect(deletes).toEqual([{ ids: ["e1", "e2", "e3"] }]);
    // The selection is gone with the entries.
    expect(page.wrapper.text()).not.toContain(
      t("entries.bulkSelected", { count: 3 }),
    );
  });

  it("copies the default text into the empty languages as drafts", async () => {
    const { page } = await openWithTicked([...VIEWER, "update_entry"]);

    await choose(page, t("entries.copyDefaultToEmpty"));

    // e1 is open: French gets its English text, the German draft stays. e3 has
    // no English text and is skipped.
    expect(field(page, "l3").element.value).toBe("Hello");
    expect(field(page, "l2").element.value).toBe("Hallo");
    expect(page.buttons()).toContain(t("common.saveAllCount", { count: 2 }));
  });

  it("needs a language to copy into", async () => {
    const { page } = await openWithTicked(
      [...VIEWER, "update_entry"],
      "/entries?locales=en",
    );
    const [copy] = await moreActions(page);

    expect(copy).toMatchObject({
      label: t("entries.copyDefaultToEmpty"),
      hint: t("entries.bulkCopyNoLanguages"),
      disabled: true,
    });
  });
});

describe("marking ticked entries to translate again", () => {
  const TRANSLATOR = [...VIEWER, "update_entry", "use_machine_translation"];

  it("marks their translations in each shown language", async () => {
    const { page, retranslates } = await openWithTicked(TRANSLATOR);

    await choose(page, t("entries.retranslateTicked"));

    const dialog = page.wrapper.find("dialog[open]");
    const ticked = { entryIds: ["e1", "e2", "e3"], includeHuman: false };

    expect(dialog.text()).toContain(
      t("entries.retranslateTitle", { count: 3 }, 3),
    );
    expect(dialog.find('[data-testid="retranslate-languages"]').text()).toBe(
      t("entries.retranslateLanguages", { languages: "German and French" }),
    );
    // The ticked entries take the place of scopes.
    expect(dialog.text()).not.toContain(t("nav.scopes"));
    // One dry run per language other than the default, the counts added up.
    expect(retranslates).toEqual([
      { localeId: "l2", ...ticked, dryRun: true },
      { localeId: "l3", ...ticked, dryRun: true },
    ]);
    expect(dialog.find('[data-testid="retranslate-count"]').text()).toBe(
      t("locales.retranslateCount", { count: 3 }, 3),
    );

    retranslates.length = 0;
    await dialog
      .findAll("button")
      .find((button) => button.text() === t("locales.retranslate"))!
      .trigger("click");
    await settle();

    expect(retranslates).toEqual([
      { localeId: "l2", ...ticked },
      { localeId: "l3", ...ticked },
    ]);
    expect(page.wrapper.find("dialog[open]").exists()).toBe(false);
  });

  it("needs a language to mark", async () => {
    const { page } = await openWithTicked(TRANSLATOR, "/entries?locales=en");
    const item = (await moreActions(page)).find(
      (entry) => entry.label === t("entries.retranslateTicked"),
    );

    expect(item).toMatchObject({
      hint: t("entries.bulkTranslateNoLanguages"),
      disabled: true,
    });
  });
});
