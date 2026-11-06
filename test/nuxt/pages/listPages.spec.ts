import { describe, expect, it } from "vitest";
import ScopesPage from "~/pages/scopes/index.vue";
import UsersPage from "~/pages/users/index.vue";
import RolesPage from "~/pages/roles/index.vue";
import LocalesPage from "~/pages/locales/index.vue";
import {
  ALL_PERMISSIONS,
  VIEWER,
  loginAs,
  mockRpc,
  mountPage,
  pagination,
  t,
} from "../helpers";

const deletedAt = "2026-10-01T10:00:00Z";
const createdAt = "2026-09-01T10:00:00Z";

describe("scopes page", () => {
  const fixtures = () =>
    mockRpc("ScopeService/ListScopes", {
      scopes: [
        { id: "s1", name: "Frontend", slug: "frontend", createdAt },
        { id: "s2", name: "Legacy", slug: "legacy", createdAt, deletedAt },
      ],
      pagination: pagination(2),
    });

  async function open(permissions: readonly string[]) {
    loginAs(permissions);
    fixtures();

    return mountPage(ScopesPage);
  }

  it("shows a viewer no actions", async () => {
    const page = await open(VIEWER);

    expect(page.wrapper.text()).toContain("Frontend");
    expect(page.headerActions()).toEqual([]);
    expect(page.iconButtons()).not.toContain(t("scopes.edit"));
    expect(page.iconButtons()).not.toContain(t("scopes.delete"));
    expect(page.iconButtons()).not.toContain(t("scopes.restore"));
  });

  it.each([
    ["create_scope", { header: ["scopes.create"], rows: [] }],
    ["update_scope", { header: [], rows: ["scopes.edit"] }],
    // Restoring is checked against the delete permission on the server.
    ["delete_scope", { header: [], rows: ["scopes.delete", "scopes.restore"] }],
  ])("with %s shows only its actions", async (permission, expected) => {
    const page = await open(["read_scope", permission]);

    expect(page.headerActions()).toEqual(expected.header.map((key) => t(key)));

    const rowActions = [
      t("scopes.edit"),
      t("scopes.delete"),
      t("scopes.restore"),
    ];

    expect(
      page.iconButtons().filter((label) => rowActions.includes(label)),
    ).toEqual(expected.rows.map((key) => t(key)));
  });

  it("shows an admin every action", async () => {
    const page = await open(ALL_PERMISSIONS);

    expect(page.headerActions()).toEqual([t("scopes.create")]);
    expect(page.iconButtons()).toEqual(
      expect.arrayContaining([
        t("scopes.edit"),
        t("scopes.delete"),
        t("scopes.restore"),
      ]),
    );
  });
});

describe("users page", () => {
  const fixtures = () =>
    mockRpc("UserService/ListUsers", {
      users: [
        { id: "u1", name: "Ada", email: "ada@parlance.dev", createdAt },
        { id: "u2", name: "Bob", email: "bob@parlance.dev", deletedAt },
      ],
      pagination: pagination(2),
    });

  async function open(permissions: readonly string[]) {
    loginAs(permissions);
    fixtures();

    return mountPage(UsersPage);
  }

  const rowActions = () => [
    t("users.edit"),
    t("users.delete"),
    t("users.restore"),
  ];

  it("shows a reader no actions", async () => {
    const page = await open(["read_user"]);

    expect(page.wrapper.text()).toContain("Ada");
    expect(page.headerActions()).toEqual([]);
    expect(
      page.iconButtons().filter((label) => rowActions().includes(label)),
    ).toEqual([]);
  });

  it.each([
    ["create_user", { header: ["users.create"], rows: [] }],
    ["update_user", { header: [], rows: ["users.edit"] }],
    ["delete_user", { header: [], rows: ["users.delete", "users.restore"] }],
  ])("with %s shows only its actions", async (permission, expected) => {
    const page = await open(["read_user", permission]);

    expect(page.headerActions()).toEqual(expected.header.map((key) => t(key)));
    expect(
      page.iconButtons().filter((label) => rowActions().includes(label)),
    ).toEqual(expected.rows.map((key) => t(key)));
  });
});

describe("roles page", () => {
  async function open(
    permissions: readonly string[],
    roles: object[] = [
      { id: "r1", name: "editor", createdAt, permissions: [] },
    ],
  ) {
    loginAs(permissions);
    mockRpc("RoleService/ListRoles", { roles, pagination: pagination(1) });

    return mountPage(RolesPage);
  }

  const rowActions = () => [t("roles.edit"), t("roles.delete")];

  it("shows a reader no actions", async () => {
    const page = await open(["read_role"]);

    expect(page.wrapper.text()).toContain("editor");
    expect(page.headerActions()).toEqual([]);
    expect(
      page.iconButtons().filter((label) => rowActions().includes(label)),
    ).toEqual([]);
  });

  it.each([
    ["create_role", { header: ["roles.create"], rows: [] }],
    ["update_role", { header: [], rows: ["roles.edit"] }],
    ["delete_role", { header: [], rows: ["roles.delete"] }],
  ])("with %s shows only its actions", async (permission, expected) => {
    const page = await open(["read_role", permission]);

    expect(page.headerActions()).toEqual(expected.header.map((key) => t(key)));
    expect(
      page.iconButtons().filter((label) => rowActions().includes(label)),
    ).toEqual(expected.rows.map((key) => t(key)));
  });

  it("offers creating a role in the empty state only with create_role", async () => {
    const reader = await open(["read_role"], []);

    expect(reader.buttons()).not.toContain(t("roles.create"));
    reader.wrapper.unmount();

    const creator = await open(["read_role", "create_role"], []);

    expect(creator.buttons()).toContain(t("roles.create"));
  });
});

describe("locales page", () => {
  const fixtures = () => {
    mockRpc("LocaleService/ListLocales", {
      locales: [
        { id: "l1", code: "en", name: "English", isDefault: true, createdAt },
        { id: "l2", code: "xx", name: "Removed", createdAt, deletedAt },
      ],
      pagination: pagination(2),
    });
    mockRpc("StatsService/GetStats", {});
  };

  async function open(permissions: readonly string[]) {
    loginAs(permissions);
    fixtures();

    return mountPage(LocalesPage);
  }

  const rowActions = () => [
    t("locales.delete"),
    t("locales.restore"),
    t("locales.permanentDelete"),
  ];

  it("shows a viewer only the view action and the export", async () => {
    const page = await open(VIEWER);

    expect(page.headerActions()).toEqual([t("export.zip.export")]);
    expect(page.iconButtons()).toContain(t("locales.view"));
    expect(
      page.iconButtons().filter((label) => rowActions().includes(label)),
    ).toEqual([]);
  });

  it("names the locales in the UI language", async () => {
    const i18n = useNuxtApp().$i18n;

    await i18n.setLocale("de");

    try {
      loginAs(VIEWER);
      mockRpc("LocaleService/ListLocales", {
        locales: [
          {
            id: "l1",
            code: "de",
            name: "German",
            names: { en: "German", de: "Deutsch" },
            createdAt,
          },
        ],
        pagination: pagination(1),
      });

      const page = await mountPage(LocalesPage);

      expect(page.wrapper.text()).toContain("Deutsch");
      expect(page.wrapper.text()).not.toContain("German");
    } finally {
      await i18n.setLocale("en");
    }
  });

  it("hides the export without read_entry", async () => {
    const page = await open(["read_locale"]);

    expect(page.headerActions()).toEqual([]);
  });

  it("offers the import only with import_entry", async () => {
    // Editing entries no longer implies importing them.
    const editor = await open([...VIEWER, "create_entry", "update_entry"]);

    expect(editor.headerActions()).not.toContain(t("import.zip.import"));
    editor.wrapper.unmount();

    const importer = await open([...VIEWER, "import_entry"]);

    expect(importer.headerActions()).toEqual([
      t("import.zip.import"),
      t("export.zip.export"),
    ]);
  });

  it.each([
    ["create_locale", { header: ["locales.create"], rows: [] }],
    [
      "delete_locale",
      { header: [], rows: ["locales.delete", "locales.restore"] },
    ],
    [
      "permanent_delete_locale",
      { header: [], rows: ["locales.permanentDelete"] },
    ],
  ])("with %s shows only its actions", async (permission, expected) => {
    const page = await open(["read_locale", permission]);

    expect(page.headerActions()).toEqual(expected.header.map((key) => t(key)));
    expect(
      page.iconButtons().filter((label) => rowActions().includes(label)),
    ).toEqual(expected.rows.map((key) => t(key)));
  });
});
