import { describe, expect, it } from "vitest";
import GlossaryPage from "~/pages/glossary/index.vue";
import {
  VIEWER,
  loginAs,
  mockRpc,
  mountPage,
  pagination,
  paletteOptions,
  runCommand,
  settle,
  t,
  type MountedPage,
} from "../helpers";

const locales = [
  { id: "l1", code: "en", name: "English", isDefault: true },
  { id: "l2", code: "de", name: "German" },
];

const terminologies = [
  {
    id: "g1",
    term: "Workspace",
    description: "Where a team works",
    definitions: [
      {
        id: "d1",
        localeId: "l1",
        translation: "Workspace",
        status: "REVIEW_STATUS_APPROVED",
      },
      {
        id: "d2",
        localeId: "l2",
        translation: "Arbeitsbereich",
        status: "REVIEW_STATUS_DRAFT",
      },
    ],
  },
  {
    id: "g2",
    term: "Release",
    definitions: [
      {
        id: "d3",
        localeId: "l1",
        translation: "Release",
        status: "REVIEW_STATUS_APPROVED",
      },
    ],
  },
];

const EDITOR = [
  ...VIEWER,
  "create_definition",
  "update_definition",
  "review_definition",
  "create_terminology",
  "update_terminology",
  "delete_terminology",
];

type Request = Record<string, unknown>;

async function openGlossary(permissions: readonly string[] = EDITOR) {
  const lists: Request[] = [];
  const saves: Request[] = [];
  const reviews: Request[] = [];

  localStorage.setItem(
    "parlance-filters.languages",
    JSON.stringify(["en", "de"]),
  );
  loginAs(permissions);
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
  mockRpc("TerminologyService/ListTerminologies", (body) => {
    lists.push(body);

    return { terminologies, pagination: pagination(terminologies.length) };
  });
  mockRpc("TerminologyService/GetTerminology", (body) => ({
    terminology: terminologies.find((term) => term.id === body.id),
  }));

  for (const method of ["CreateDefinition", "UpdateDefinition"]) {
    mockRpc(`DefinitionService/${method}`, (body) => {
      saves.push(body);

      return {};
    });
  }

  mockRpc("DefinitionService/ReviewDefinitions", (body) => {
    reviews.push(body);

    return {};
  });

  const page = await mountPage(GlossaryPage, { attach: true });

  return { page, lists, saves, reviews };
}

const field = (page: MountedPage, termId: string, localeId: string) =>
  page.wrapper.find<HTMLTextAreaElement>(`#terminology-${termId}-${localeId}`);

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

const labels = async (page: MountedPage) =>
  (await paletteOptions(page)).map(({ text }) => text);

describe("glossary commands", () => {
  it("offers an editor what the term's buttons do", async () => {
    const { page } = await openGlossary();

    expect(await labels(page)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(t("common.saveChanges")),
        expect.stringContaining(t("commands.saveAndNextTerm")),
        expect.stringContaining(t("terminologies.previous")),
        expect.stringContaining(t("terminologies.next")),
        expect.stringContaining(t("commands.approveAll")),
        t("entries.copyDefaultToEmpty"),
        t("terminologies.edit"),
        t("terminologies.delete"),
        t("commands.toggleContext"),
        expect.stringContaining(t("commands.searchGlossary")),
        t("terminologies.create"),
        t("commands.showStatus", { status: t("entries.filterReview") }),
        "Workspace",
        "Release",
      ]),
    );
  });

  it("leaves out for a viewer what they may not do", async () => {
    const { page } = await openGlossary(VIEWER);
    const options = await labels(page);

    for (const label of [
      t("commands.approveAll"),
      t("entries.copyDefaultToEmpty"),
      t("terminologies.edit"),
      t("terminologies.delete"),
      t("terminologies.create"),
    ]) {
      expect(options.some((option) => option.startsWith(label))).toBe(false);
    }

    // Moving between terms and filtering is for everyone.
    expect(options).toEqual(
      expect.arrayContaining([
        expect.stringContaining(t("terminologies.next")),
        "Release",
      ]),
    );
  });

  it("goes to a term, found by its description too", async () => {
    const { page } = await openGlossary();

    expect(
      (await paletteOptions(page)).find(({ text }) => text === "Workspace"),
    ).toBeDefined();

    await runCommand(page, "Release");

    expect(field(page, "g2", "l1").exists()).toBe(true);
  });

  it("filters by status", async () => {
    const { page, lists } = await openGlossary();

    await runCommand(
      page,
      t("commands.showStatus", { status: t("entries.filterReview") }),
    );

    expect(lists.at(-1)?.translationStatus).toBe("review");
  });
});

describe("glossary shortcuts", () => {
  it("saves the open term", async () => {
    const { page, saves } = await openGlossary();
    const german = field(page, "g1", "l2");

    await german.setValue("Arbeitsplatz");
    german.element.focus();
    await press("s", { ctrlKey: true });

    expect(saves).toEqual([{ id: "d2", translation: "Arbeitsplatz" }]);
  });

  it("moves to the next term in the same language", async () => {
    const { page, saves } = await openGlossary();

    field(page, "g1", "l2").element.focus();
    await press("ArrowDown", { altKey: true });

    expect(field(page, "g2", "l1").exists()).toBe(true);
    expect(document.activeElement?.id).toBe("terminology-g2-l2");

    await press("ArrowUp", { altKey: true });

    expect(field(page, "g1", "l1").exists()).toBe(true);
    expect(saves).toEqual([]);
  });

  it("approves the open term's drafts", async () => {
    const { page, reviews } = await openGlossary();

    field(page, "g1", "l1").element.focus();
    await press("Enter", { altKey: true });

    expect(reviews).toEqual([
      expect.objectContaining({ terminologyIds: ["g1"], localeIds: ["l2"] }),
    ]);
  });

  it("doesn't save for a viewer", async () => {
    const { page, saves } = await openGlossary(VIEWER);

    field(page, "g1", "l2").element.focus();
    await press("s", { ctrlKey: true });

    expect(saves).toEqual([]);
  });
});
