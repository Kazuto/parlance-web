import { describe, expect, it } from "vitest";
import { SplitView } from "@thkzt/eunoia";
import EntriesPage from "~/pages/entries/index.vue";
import {
  VIEWER,
  actionMenuLabels,
  openActionMenu,
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
    { id: "z1", entryId: "e1", localeId: "l1", translation: "Hello {name}" },
    { id: "z3", entryId: "e1", localeId: "l3", translation: "Bonjour {name}" },
  ],
};

type Suggestion = {
  localeId: string;
  translation?: string;
  warnings?: { code: string; detail?: string }[];
  errorCode?: string;
  model?: string;
};

async function openEditor(
  options: {
    permissions?: readonly string[];
    enabled?: boolean;
    suggestions?: Suggestion[];
  } = {},
) {
  const requests: { entryId?: string; targetLocaleIds?: string[] }[] = [];
  const saves: string[] = [];
  const saved: Record<string, unknown>[] = [];

  loginAs(
    options.permissions ?? [
      ...VIEWER,
      "update_entry",
      "use_machine_translation",
    ],
  );
  mockRpc("AuthService/GetCurrentUser", {
    translationEnabled: options.enabled ?? true,
  });
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
  mockRpc("EntryService/ListEntries", {
    entries: [entry],
    pagination: pagination(1),
  });
  mockRpc("EntryService/GetEntry", { entry });
  mockRpc("LocalizationService/SuggestTranslations", (body) => {
    requests.push(body);

    return { suggestions: options.suggestions ?? [] };
  });

  for (const method of ["CreateLocalization", "UpdateLocalization"]) {
    mockRpc(`LocalizationService/${method}`, (body) => {
      saves.push(method);
      saved.push(body);

      return {};
    });
  }

  const page = await mountPage(EntriesPage, {
    route: "/entries?locales=en,de,fr",
  });

  return { page, requests, saves, saved };
}

const field = (page: MountedPage, localeId: string) =>
  page.wrapper.find<HTMLTextAreaElement>(`textarea[id$="-${localeId}"]`);

/** The menu item, or undefined when the menu doesn't offer it. */
async function translateItem(page: MountedPage) {
  const items = await openActionMenu(page, t("entries.actions"));

  return items.find((entry) => entry.label === t("entries.aiTranslateEmpty"));
}

async function translate(page: MountedPage) {
  await (await translateItem(page))!.item.trigger("click");
  await settle();
}

describe("machine translation in the editor", () => {
  it("fills only the empty languages, as unsaved drafts", async () => {
    const { page, requests, saves } = await openEditor({
      suggestions: [{ localeId: "l2", translation: "Hallo {name}" }],
    });

    await translate(page);

    expect(requests).toEqual([{ entryId: "e1", targetLocaleIds: ["l2"] }]);
    expect(field(page, "l2").element.value).toBe("Hallo {name}");
    expect(field(page, "l3").element.value).toBe("Bonjour {name}");
    // The draft waits for review: nothing is saved yet.
    expect(saves).toEqual([]);
    expect(page.buttons()).toContain(t("common.saveChanges"));
  });

  it("saves a suggestion as the model's text until it is edited", async () => {
    const { page, saved } = await openEditor({
      suggestions: [
        { localeId: "l2", translation: "Hallo {name}", model: "hy-mt2-7b" },
      ],
    });
    const save = async () => {
      await page.wrapper
        .findAll("button")
        .find((button) => button.text().trim() === t("common.saveChanges"))!
        .trigger("click");
      await settle();
    };

    await translate(page);
    await save();

    expect(saved.at(-1)).toMatchObject({
      localeId: "l2",
      translation: "Hallo {name}",
      machineModel: "hy-mt2-7b",
    });

    await translate(page);
    await field(page, "l2").setValue("Servus {name}");
    await save();

    expect(saved.at(-1)).toMatchObject({ translation: "Servus {name}" });
    expect(saved.at(-1)).not.toHaveProperty("machineModel");
  });

  it("flags a suggestion to check until it is edited", async () => {
    const { page } = await openEditor({
      suggestions: [
        {
          localeId: "l2",
          translation: "Hallo {Name}",
          warnings: [
            { code: "PLACEHOLDER_MISSING", detail: "{name}" },
            { code: "PLACEHOLDER_UNEXPECTED", detail: "{Name}" },
          ],
        },
      ],
    });

    await translate(page);

    expect(page.wrapper.text()).toContain(t("entries.suggestionCheck"));
    expect(page.wrapper.text()).toContain(
      t("entries.suggestionWarning.PLACEHOLDER_MISSING", {
        placeholder: "{name}",
      }),
    );

    await field(page, "l2").setValue("Hallo {name}");
    await settle();
    expect(page.wrapper.text()).not.toContain(t("entries.suggestionCheck"));
  });

  it("reports a language that could not be translated", async () => {
    const { page } = await openEditor({
      suggestions: [{ localeId: "l2", errorCode: "UNSUPPORTED_LANGUAGE" }],
    });

    await translate(page);

    expect(field(page, "l2").element.value).toBe("");
    expect(page.wrapper.text()).toContain(t("entries.suggestionFailed"));
    expect(page.wrapper.text()).toContain(
      t("entries.suggestionError.UNSUPPORTED_LANGUAGE"),
    );
  });

  it("keeps text typed while waiting", async () => {
    const { page } = await openEditor({
      suggestions: [{ localeId: "l2", translation: "Hallo {name}" }],
    });

    const click = (await translateItem(page))!.item.trigger("click");

    await field(page, "l2").setValue("Servus {name}");
    await click;
    await settle();

    expect(field(page, "l2").element.value).toBe("Servus {name}");
  });

  it("explains why it can't run while every language has text", async () => {
    const { page } = await openEditor();

    await field(page, "l2").setValue("Hallo {name}");
    await settle();

    const item = (await translateItem(page))!;

    expect(item.disabled).toBe(true);
    expect(item.hint).toBe(t("entries.noEmptyLanguages"));
  });

  it("unlocks the languages when the request fails", async () => {
    const { page } = await openEditor();

    mockRpc("LocalizationService/SuggestTranslations", () =>
      Promise.reject(new Error("server down")),
    );

    await translate(page);

    expect(field(page, "l2").attributes("aria-busy")).toBeUndefined();
    expect(field(page, "l2").attributes("readonly")).toBeUndefined();
    expect(page.wrapper.text()).not.toContain(t("entries.translating"));
  });

  it("shows that it is translating", async () => {
    const { page } = await openEditor();
    // Hold the answer back until the test lets it through.
    let answer!: (value: object) => void;

    mockRpc(
      "LocalizationService/SuggestTranslations",
      () => new Promise((resolve) => (answer = resolve)),
    );

    await (await translateItem(page))!.item.trigger("click");
    await settle();

    const statuses = page.wrapper
      .findAll('[role="status"]')
      .map((status) => status.text());

    expect(statuses).toContain(t("entries.translating"));
    // Only the empty language waits; it is locked and says so.
    expect(field(page, "l2").attributes("aria-busy")).toBe("true");
    expect(field(page, "l2").attributes("readonly")).toBeDefined();
    // The overlay says what is happening; the placeholder would show through.
    expect(field(page, "l2").attributes("placeholder")).toBeUndefined();
    expect(field(page, "l3").attributes("aria-busy")).toBeUndefined();
    expect(field(page, "l3").attributes("readonly")).toBeUndefined();

    answer({ suggestions: [{ localeId: "l2", translation: "Hallo {name}" }] });
    await settle();
    expect(page.wrapper.text()).not.toContain(t("entries.translating"));
    expect(field(page, "l2").element.value).toBe("Hallo {name}");
    expect(field(page, "l2").attributes("aria-busy")).toBeUndefined();
    expect(field(page, "l2").attributes("readonly")).toBeUndefined();
    expect(field(page, "l2").attributes("placeholder")).toBe(
      t("entries.translationPlaceholder"),
    );
  });

  it("waits for the default text to be saved", async () => {
    const { page, requests } = await openEditor();

    await field(page, "l1").setValue("Hi {name}");
    await settle();

    const item = (await translateItem(page))!;

    expect(item.disabled).toBe(true);
    expect(item.hint).toBe(t("entries.translateSaveSourceFirst"));
    await translate(page);
    expect(requests).toEqual([]);
  });

  it("is hidden while the server has no translation model", async () => {
    const { page } = await openEditor({ enabled: false });

    expect(await actionMenuLabels(page, t("entries.actions"))).toContain(
      t("entries.copyDefaultToEmpty"),
    );
    expect(await translateItem(page)).toBeUndefined();
  });

  it("needs use_machine_translation", async () => {
    const { page } = await openEditor({
      permissions: [...VIEWER, "update_entry"],
    });

    expect(await actionMenuLabels(page, t("entries.actions"))).toContain(
      t("entries.copyDefaultToEmpty"),
    );
    expect(await translateItem(page)).toBeUndefined();
  });

  it("is hidden from viewers", async () => {
    const { page } = await openEditor({ permissions: VIEWER });

    expect(await translateItem(page)).toBeUndefined();
  });
});

describe("machine translation of ticked entries", () => {
  // e1 misses German, e2 has no English text to translate from, e3 misses both.
  const entries = [
    entry,
    {
      id: "e2",
      key: "farewell",
      scopes: [],
      localizations: [],
    },
    {
      id: "e3",
      key: "thanks",
      scopes: [],
      localizations: [
        { id: "z5", entryId: "e3", localeId: "l1", translation: "Thanks" },
      ],
    },
  ];

  async function openWithTicked(
    options: {
      permissions?: readonly string[];
      route?: string;
      answer?: (body: {
        entryId?: string;
        targetLocaleIds?: string[];
      }) => unknown;
    } = {},
  ) {
    const requests: { entryId?: string; targetLocaleIds?: string[] }[] = [];

    loginAs(
      options.permissions ?? [
        ...VIEWER,
        "update_entry",
        "use_machine_translation",
      ],
    );
    mockRpc("AuthService/GetCurrentUser", { translationEnabled: true });
    mockRpc("LocaleService/ListLocales", {
      locales,
      pagination: pagination(locales.length),
    });
    mockRpc("EntryService/ListEntries", {
      entries,
      pagination: pagination(entries.length),
    });
    mockRpc("EntryService/GetEntry", (body) => ({
      entry: entries.find((item) => item.id === body.id),
    }));
    mockRpc("LocalizationService/SuggestTranslations", (body) => {
      const request = body as { entryId?: string; targetLocaleIds?: string[] };

      requests.push(request);

      return (
        options.answer?.(request) ?? {
          suggestions: request.targetLocaleIds?.map((localeId) => ({
            localeId,
            translation: `${request.entryId}-${localeId}`,
          })),
        }
      );
    });

    const page = await mountPage(EntriesPage, {
      route: options.route ?? "/entries?locales=en,de,fr",
    });

    // The list is virtualized and renders no rows here, so tick through it.
    page.wrapper
      .findComponent(SplitView)
      .vm.$emit("update:selection", ["e1", "e2", "e3"]);
    await settle();

    return { page, requests };
  }

  const bulkButton = (page: MountedPage) =>
    page.wrapper
      .findAll("button")
      .find((button) => button.text().trim() === t("entries.bulkTranslate"));

  it("fills the empty languages of each ticked entry as drafts", async () => {
    const { page, requests } = await openWithTicked();

    await bulkButton(page)!.trigger("click");
    await settle();

    // e2 has nothing to translate from and is skipped.
    expect(requests).toEqual([
      { entryId: "e1", targetLocaleIds: ["l2"] },
      { entryId: "e3", targetLocaleIds: ["l2", "l3"] },
    ]);
    // The open entry shows its draft; all three wait for Save all.
    expect(field(page, "l2").element.value).toBe("e1-l2");
    expect(page.buttons()).toContain(t("common.saveAllCount", { count: 3 }));
  });

  it("can be stopped between entries", async () => {
    let answer!: (value: unknown) => void;
    const { page, requests } = await openWithTicked({
      answer: (request) =>
        request.entryId === "e1"
          ? new Promise((resolve) => (answer = resolve))
          : undefined,
    });

    await bulkButton(page)!.trigger("click");
    await settle();
    expect(page.wrapper.text()).toContain(
      t("entries.bulkTranslateProgress", { done: 0, total: 3 }),
    );

    const stop = page.wrapper
      .findAll("button")
      .find(
        (button) => button.text().trim() === t("entries.bulkTranslateStop"),
      )!;

    await stop.trigger("click");
    answer({ suggestions: [{ localeId: "l2", translation: "Hallo" }] });
    await settle();

    expect(requests.map((request) => request.entryId)).toEqual(["e1"]);
    expect(field(page, "l2").element.value).toBe("Hallo");
    expect(bulkButton(page)).toBeDefined();
  });

  it("needs a language to translate into", async () => {
    const { page } = await openWithTicked({ route: "/entries?locales=en" });

    expect(bulkButton(page)!.attributes("disabled")).toBeDefined();
    expect(bulkButton(page)!.attributes("title")).toBe(
      t("entries.bulkTranslateNoLanguages"),
    );
  });

  it("is only offered with use_machine_translation", async () => {
    const { page } = await openWithTicked({
      permissions: [...VIEWER, "update_entry"],
    });

    expect(page.wrapper.text()).toContain(t("entries.bulkEditScopes"));
    expect(bulkButton(page)).toBeUndefined();
  });
});
