import { describe, expect, it } from "vitest";
import { SplitView } from "@thkzt/eunoia";
import EntriesPage from "~/pages/entries/index.vue";
import GlossaryPage from "~/pages/glossary/index.vue";
import LocalePage from "~/pages/locales/[id].vue";
import TransferPage from "~/pages/entries/transfer.vue";
import {
  ALL_PERMISSIONS,
  VIEWER,
  actionMenuLabels,
  loginAs,
  mockRpc,
  mountPage,
  pagination,
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
];

function mockLocales() {
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
}

/** The editor's text fields, by whether they can be typed into. */
function fields(page: MountedPage) {
  return page.wrapper
    .findAll("textarea")
    .filter((field) => !field.element.closest("dialog:not([open])"))
    .map((field) =>
      field.attributes("readonly") === undefined ? "editable" : "readonly",
    );
}

// Ticking entries in the list is for bulk scope edits. The list is virtualized and
// renders no rows without a layout, so check the switch instead of the checkboxes.
const isSelectable = (page: MountedPage) =>
  page.wrapper.findComponent(SplitView).props("selectable");

describe("entries page", () => {
  const entry = {
    id: "e1",
    key: "app.title",
    scopes: [],
    localizations: [
      { id: "z1", entryId: "e1", localeId: "l1", translation: "Hello" },
    ],
  };

  async function open(permissions: readonly string[]) {
    loginAs(permissions);
    mockLocales();
    mockRpc("EntryService/ListEntries", {
      entries: [entry],
      pagination: pagination(1),
    });
    mockRpc("EntryService/GetEntry", { entry });
    return mountPage(EntriesPage);
  }

  const entryActions = (page: MountedPage) =>
    actionMenuLabels(page, t("entries.actions"));

  it("lets a viewer read but change nothing", async () => {
    const page = await open(VIEWER);

    expect(page.wrapper.text()).toContain("app.title");
    // Export stays: it only reads.
    expect(page.headerActions()).toEqual([t("entries.export")]);
    expect(await entryActions(page)).toEqual([]);
    expect(page.buttons()).not.toContain(t("common.saveChanges"));
    expect(page.wrapper.text()).not.toContain(t("entries.noScopes"));
    expect(isSelectable(page)).toBe(false);
    expect(fields(page).length).toBeGreaterThan(0);
    expect(fields(page)).not.toContain("editable");
  });

  it("offers creating only with create_entry", async () => {
    const page = await open([...VIEWER, "create_entry"]);

    expect(page.headerActions()).toEqual([
      t("entries.create"),
      t("entries.export"),
    ]);
    expect(await entryActions(page)).toEqual([]);
  });

  it("offers the import only with create_entry and update_entry", async () => {
    const page = await open([...VIEWER, "create_entry", "update_entry"]);

    expect(page.headerActions()).toEqual([
      t("entries.create"),
      t("entries.import"),
      t("entries.export"),
    ]);
  });

  it("lets update_entry edit translations, keys and scopes", async () => {
    const page = await open([...VIEWER, "update_entry"]);

    expect(page.headerActions()).toEqual([t("entries.export")]);
    // No AI translation: no server is enabled and the permission is missing.
    expect(await entryActions(page)).toEqual([
      t("entries.copyDefaultToEmpty"),
      t("entries.edit"),
    ]);
    expect(page.buttons()).toContain(t("common.saveChanges"));
    expect(page.wrapper.text()).toContain(t("entries.noScopes"));
    expect(isSelectable(page)).toBe(true);
    expect(fields(page)).not.toContain("readonly");
  });

  it("lets delete_entry delete but not edit", async () => {
    const page = await open([...VIEWER, "delete_entry"]);

    expect(await entryActions(page)).toEqual([t("actions.deleteEntry")]);
    expect(fields(page)).not.toContain("editable");
  });

  it("shows an admin every action", async () => {
    const page = await open(ALL_PERMISSIONS);

    expect(page.headerActions()).toEqual([
      t("entries.create"),
      t("entries.import"),
      t("entries.export"),
    ]);
    expect(await entryActions(page)).toEqual([
      t("entries.copyDefaultToEmpty"),
      t("entries.edit"),
      t("actions.deleteEntry"),
    ]);
  });
});

describe("glossary page", () => {
  // English has a definition, German has none yet.
  const terminology = {
    id: "g1",
    term: "Workspace",
    definitions: [
      {
        id: "d1",
        terminologyId: "g1",
        localeId: "l1",
        translation: "Workspace",
      },
    ],
  };

  async function open(permissions: readonly string[]) {
    loginAs(permissions);
    mockLocales();
    mockRpc("TerminologyService/ListTerminologies", {
      terminologies: [terminology],
      pagination: pagination(1),
    });
    mockRpc("TerminologyService/GetTerminology", { terminology });
    return mountPage(GlossaryPage);
  }

  // Shows both languages, so each field maps to a known definition state. The
  // page picks up the languages last chosen, which are stored by code.
  function openWithBothLanguages(permissions: readonly string[]) {
    localStorage.setItem(
      "parlance-filters.languages",
      JSON.stringify(["en", "de"]),
    );
    return open(permissions);
  }

  it("lets a viewer read but change nothing", async () => {
    const page = await open(VIEWER);

    expect(page.wrapper.text()).toContain("Workspace");
    expect(page.headerActions()).toEqual([]);
    expect(page.iconButtons()).not.toContain(t("terminologies.edit"));
    expect(page.iconButtons()).not.toContain(t("terminologies.delete"));
    expect(page.buttons()).not.toContain(t("common.saveChanges"));
    expect(page.buttons()).not.toContain(t("entries.copyEmptyShort"));
    expect(fields(page)).not.toContain("editable");
  });

  it.each([
    ["create_terminology", { header: ["terminologies.create"], icons: [] }],
    ["update_terminology", { header: [], icons: ["terminologies.edit"] }],
    ["delete_terminology", { header: [], icons: ["terminologies.delete"] }],
  ])("with %s shows only its term actions", async (permission, expected) => {
    const page = await open([...VIEWER, permission]);

    expect(page.headerActions()).toEqual(expected.header.map((key) => t(key)));
    const termActions = [t("terminologies.edit"), t("terminologies.delete")];
    expect(
      page.iconButtons().filter((label) => termActions.includes(label)),
    ).toEqual(expected.icons.map((key) => t(key)));
    // Term permissions do not unlock the definitions.
    expect(fields(page)).not.toContain("editable");
  });

  it("lets update_definition change existing definitions only", async () => {
    const page = await openWithBothLanguages([...VIEWER, "update_definition"]);

    // English exists and may change; German would have to be created.
    expect(fields(page)).toEqual(["editable", "readonly"]);
    expect(page.buttons()).toContain(t("common.saveChanges"));
  });

  it("lets create_definition add missing definitions only", async () => {
    const page = await openWithBothLanguages([...VIEWER, "create_definition"]);

    expect(fields(page)).toEqual(["readonly", "editable"]);
    expect(page.buttons()).toContain(t("common.saveChanges"));
    expect(page.buttons()).toContain(t("entries.copyEmptyShort"));
  });

  it("lets both definition permissions change every definition", async () => {
    const page = await openWithBothLanguages([
      ...VIEWER,
      "create_definition",
      "update_definition",
    ]);

    expect(fields(page)).toEqual(["editable", "editable"]);
  });
});

describe("locale page", () => {
  async function open(permissions: readonly string[]) {
    loginAs(permissions);
    mockLocales();
    mockRpc("LocaleService/GetLocale", { locale: locales[0] });
    return mountPage(LocalePage, { route: "/locales/l1" });
  }

  it("lets a viewer read the names but change nothing", async () => {
    const page = await open(VIEWER);

    expect(page.wrapper.text()).toContain("English");
    expect(page.iconButtons()).not.toContain(t("locales.edit"));
    expect(page.iconButtons()).not.toContain(t("locales.delete"));
    expect(page.buttons()).not.toContain(t("common.saveChanges"));
    expect(fields(page).length).toBeGreaterThan(0);
    expect(fields(page)).not.toContain("editable");
  });

  it("lets update_locale edit the locale", async () => {
    const page = await open([...VIEWER, "update_locale"]);

    expect(page.iconButtons()).toContain(t("locales.edit"));
    expect(page.iconButtons()).not.toContain(t("locales.delete"));
    expect(page.buttons()).toContain(t("common.saveChanges"));
    expect(fields(page)).not.toContain("readonly");
  });

  it("lets delete_locale delete but not edit", async () => {
    const page = await open([...VIEWER, "delete_locale"]);

    expect(page.iconButtons()).toContain(t("locales.delete"));
    expect(page.iconButtons()).not.toContain(t("locales.edit"));
    expect(fields(page)).not.toContain("editable");
  });
});

describe("import / export page", () => {
  async function open(
    permissions: readonly string[],
    route = "/entries/transfer",
  ) {
    loginAs(permissions);
    mockLocales();
    return mountPage(TransferPage, { route });
  }

  const tabs = (page: MountedPage) =>
    page.wrapper.findAll('[role="tab"]').map((tab) => tab.text().trim());

  it("offers a viewer only the export", async () => {
    const page = await open(VIEWER);
    expect(tabs(page)).toEqual([t("transfer.exportTab")]);
  });

  it("opens on the export even when a link asks for the import", async () => {
    const page = await open(VIEWER, "/entries/transfer?tab=import");
    expect(page.wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe(
      t("transfer.exportTab"),
    );
  });

  it.each([[["create_entry"]], [["update_entry"]]])(
    "keeps the import hidden with only %j",
    async (extra) => {
      const page = await open([...VIEWER, ...extra]);
      expect(tabs(page)).toEqual([t("transfer.exportTab")]);
    },
  );

  it("offers the import with create_entry and update_entry", async () => {
    const page = await open([...VIEWER, "create_entry", "update_entry"]);
    expect(tabs(page)).toEqual([
      t("transfer.importTab"),
      t("transfer.exportTab"),
    ]);
  });
});
