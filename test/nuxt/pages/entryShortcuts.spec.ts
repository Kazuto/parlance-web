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
];

const entries = [
  {
    id: "e1",
    key: "first",
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
    ],
  },
  {
    id: "e2",
    key: "second",
    scopes: [],
    localizations: [
      {
        id: "z3",
        localeId: "l1",
        translation: "Bye",
        status: "REVIEW_STATUS_APPROVED",
      },
    ],
  },
];

const EDITOR = [...VIEWER, "update_entry", "review_entry"];

async function openEditor() {
  const saves: { id?: string; entryId?: string; translation?: string }[] = [];
  const reviews: { localeIds?: string[] }[] = [];

  loginAs(EDITOR);
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
  mockRpc("EntryService/ListEntries", {
    entries,
    pagination: pagination(entries.length),
  });
  mockRpc("EntryService/GetEntry", (body) => ({
    entry: entries.find((entry) => entry.id === body.id),
  }));

  for (const method of ["CreateLocalization", "UpdateLocalization"]) {
    mockRpc(`LocalizationService/${method}`, (body) => {
      saves.push(body);

      return {};
    });
  }

  mockRpc("LocalizationService/ReviewLocalizations", (body) => {
    reviews.push(body);

    return {};
  });

  const page = await mountPage(EntriesPage, {
    route: "/entries?locales=en,de",
    attach: true,
  });

  return { page, saves, reviews };
}

const field = (page: MountedPage, entryId: string, localeId: string) =>
  page.wrapper.find<HTMLTextAreaElement>(`#entry-${entryId}-${localeId}`);

/** Presses a key where the focus is, as the user would. */
async function press(key: string, modifiers: KeyboardEventInit = {}) {
  (document.activeElement ?? document.body).dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...modifiers,
    }),
  );
  await settle();
}

describe("editor shortcuts", () => {
  it("saves the open entry", async () => {
    const { page, saves } = await openEditor();
    const german = field(page, "e1", "l2");

    await german.setValue("Hallöchen");
    german.element.focus();
    await press("s", { ctrlKey: true });

    expect(saves).toEqual([{ id: "z2", translation: "Hallöchen" }]);
  });

  it("saves, then moves to the next entry in the same language", async () => {
    const { page, saves } = await openEditor();
    const german = field(page, "e1", "l2");

    await german.setValue("Hallöchen");
    german.element.focus();
    await press("Enter", { ctrlKey: true });

    expect(saves).toHaveLength(1);
    expect(field(page, "e2", "l2").exists()).toBe(true);
    expect(document.activeElement?.id).toBe("entry-e2-l2");
  });

  it("moves between entries without saving", async () => {
    const { page, saves } = await openEditor();
    const german = field(page, "e1", "l2");

    await german.setValue("Hallöchen");
    german.element.focus();
    await press("ArrowDown", { altKey: true });

    expect(field(page, "e2", "l1").exists()).toBe(true);
    expect(document.activeElement?.id).toBe("entry-e2-l2");

    await press("ArrowUp", { altKey: true });

    expect(field(page, "e1", "l2").element.value).toBe("Hallöchen");
    expect(saves).toEqual([]);
  });

  it("approves the open entry's drafts, wherever the focus is", async () => {
    const { page, saves, reviews } = await openEditor();

    // The English text is approved already; German is the draft.
    field(page, "e1", "l1").element.focus();
    await press("Enter", { altKey: true });

    expect(reviews).toEqual([
      expect.objectContaining({ localeIds: ["l2"], entryIds: ["e1"] }),
    ]);
    // Alt+Enter is not also save-and-next.
    expect(saves).toEqual([]);
    expect(field(page, "e1", "l2").exists()).toBe(true);
  });

  it("copies the default text into the focused field", async () => {
    const { page } = await openEditor();
    const german = field(page, "e1", "l2");

    german.element.focus();
    await press("d", { ctrlKey: true });

    expect(german.element.value).toBe("Hello");
  });
});

describe("editor command palette", () => {
  it("opens from the keyboard and runs a command", async () => {
    const { page } = await openEditor();

    await press("k", { ctrlKey: true });

    const options = page.wrapper.findAll('dialog[open] [role="option"]');

    expect(options.map((option) => option.text())).toEqual(
      expect.arrayContaining([
        expect.stringContaining(t("commands.nextEntry")),
        "second",
        t("nav.dashboard"),
      ]),
    );

    await options
      .find((option) => option.text().includes(t("commands.nextEntry")))!
      .trigger("click");
    await settle();

    expect(page.wrapper.find("dialog[open]").exists()).toBe(false);
    expect(field(page, "e2", "l1").exists()).toBe(true);
  });

  it("jumps to an entry by its key", async () => {
    const { page } = await openEditor();

    await page.wrapper
      .findAll("button")
      .find((button) => button.text().includes(t("commands.open")))!
      .trigger("click");
    await settle();
    await page.wrapper
      .findAll('dialog[open] [role="option"]')
      .find((option) => option.text() === "second")!
      .trigger("click");
    await settle();

    expect(field(page, "e2", "l1").exists()).toBe(true);
  });

  it("approves all drafts with one command, keyed Alt+Enter", async () => {
    const { page, reviews } = await openEditor();

    field(page, "e1", "l2").element.focus();
    await press("k", { ctrlKey: true });

    const options = page.wrapper.findAll('dialog[open] [role="option"]');
    const labels = options.map((option) => option.text());

    // One approve command: not one per language, nor the header menu's as well.
    expect(
      labels.filter((label) => label.includes(t("review.approveShown"))),
    ).toEqual([]);
    expect(
      labels.filter((label) =>
        label.startsWith(t("review.approveFor", { language: "German" })),
      ),
    ).toEqual([]);

    const approve = options.find((option) =>
      option.text().startsWith(t("commands.approveAll")),
    )!;

    expect(approve.text()).toContain("Alt");

    await approve.trigger("click");
    await settle();

    expect(reviews).toEqual([
      expect.objectContaining({ localeIds: ["l2"], entryIds: ["e1"] }),
    ]);
  });

  it("copies into the language whose field had the focus", async () => {
    const { page } = await openEditor();
    const german = field(page, "e1", "l2");

    german.element.focus();
    await press("k", { ctrlKey: true });
    await page.wrapper
      .findAll('dialog[open] [role="option"]')
      .find((option) =>
        option
          .text()
          .startsWith(t("commands.copySourceTo", { language: "German" })),
      )!
      .trigger("click");
    await settle();

    expect(german.element.value).toBe("Hello");
  });

  it("lists the copy command without a focused field, disabled", async () => {
    const { page } = await openEditor();

    await page.wrapper
      .findAll("button")
      .find((button) => button.text().includes(t("commands.open")))!
      .trigger("click");
    await settle();

    const options = page.wrapper.findAll('dialog[open] [role="option"]');
    const disabled = (label: string) =>
      options
        .find((option) => option.text().startsWith(label))
        ?.attributes("aria-disabled");

    expect(disabled(t("commands.copySourceFocused"))).toBe("true");
  });
});
