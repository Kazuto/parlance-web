import { describe, expect, it, vi } from "vitest";
import DashboardPage from "~/pages/index.vue";
import LocalesPage from "~/pages/locales/index.vue";
import LocalePage from "~/pages/locales/[id].vue";
import ScopesPage from "~/pages/scopes/index.vue";
import ReleasesPage from "~/pages/releases/index.vue";
import TasksPage from "~/pages/tasks/index.vue";
import WebhooksPage from "~/pages/webhooks/index.vue";
import TransferPage from "~/pages/entries/transfer.vue";
import {
  VIEWER,
  loginAs,
  mockRpc,
  mountPage,
  pageCommands,
  pagination,
  paletteOptions,
  runCommand,
  t,
} from "../helpers";

const createdAt = "2026-09-01T10:00:00Z";
const deletedAt = "2026-10-01T10:00:00Z";

const locales = [
  { id: "l1", code: "en", name: "English", isDefault: true, createdAt },
  { id: "l2", code: "xx", name: "Removed", createdAt, deletedAt },
];

// The route changes once the page's code has loaded.
const expectPath = (path: string) =>
  vi.waitFor(() => expect(useRouter().currentRoute.value.fullPath).toBe(path));

describe("header actions in the palette", () => {
  async function openLocales(permissions: readonly string[]) {
    loginAs(permissions);
    mockRpc("LocaleService/ListLocales", {
      locales,
      pagination: pagination(locales.length),
    });
    mockRpc("StatsService/GetStats", {});

    return mountPage(LocalesPage, { attach: true });
  }

  it("lists the header's actions, the ones the user may take", async () => {
    const reader = await openLocales(["read_locale"]);

    expect(await pageCommands(reader)).toEqual([
      t("commands.openLanguage", { language: "English" }),
    ]);
    reader.wrapper.unmount();

    const admin = await openLocales([
      "read_locale",
      "create_locale",
      "import_entry",
      "export_entry",
    ]);

    expect(await pageCommands(admin)).toEqual([
      t("locales.create"),
      t("import.zip.import"),
      t("export.zip.export"),
      t("commands.openLanguage", { language: "English" }),
    ]);
  });

  it("opens a language", async () => {
    const page = await openLocales(["read_locale"]);

    await runCommand(page, t("commands.openLanguage", { language: "English" }));

    await expectPath("/locales/l1");
  });
});

describe("language page commands", () => {
  async function openLocale(permissions: readonly string[]) {
    loginAs(permissions);
    mockRpc("LocaleService/ListLocales", {
      locales,
      pagination: pagination(locales.length),
    });
    mockRpc("LocaleService/GetLocale", { locale: locales[0] });

    return mountPage(LocalePage, { route: "/locales/l1", attach: true });
  }

  it("offers a viewer the search only", async () => {
    const page = await openLocale(VIEWER);

    expect(await pageCommands(page)).toEqual([t("commands.search")]);
  });

  it("offers an editor the footer's and the menu's actions", async () => {
    const page = await openLocale([
      ...VIEWER,
      "update_locale",
      "delete_locale",
    ]);

    expect(await pageCommands(page)).toEqual([
      t("common.saveChanges"),
      t("common.saveAll"),
      t("common.discardAll"),
      t("locales.fillNames"),
      t("locales.fillAllNames"),
      t("locales.edit"),
      t("locales.delete"),
      t("commands.search"),
    ]);
    // Nothing is unsaved yet.
    expect(
      (await paletteOptions(page)).find(
        ({ label }) => label === t("common.saveChanges"),
      )?.disabled,
    ).toBe(true);
  });
});

describe("dashboard commands", () => {
  async function openDashboard(permissions: readonly string[]) {
    loginAs(permissions);
    mockRpc("StatsService/GetStats", {
      byLocale: [{ localeId: "l1", localeCode: "en" }],
    });
    mockRpc("LocaleService/ListLocales", {
      locales,
      pagination: pagination(locales.length),
    });

    return mountPage(DashboardPage, { attach: true });
  }

  it("shows the entries behind the cards", async () => {
    const page = await openDashboard(VIEWER);
    const review = t("commands.showStatus", {
      status: t("entries.filterReview"),
    });

    expect(await pageCommands(page)).toEqual([
      t("commands.showStatus", { status: t("entries.missingTranslations") }),
      review,
      t("commands.showStatus", { status: t("entries.filterComplete") }),
    ]);

    await runCommand(page, review);

    await expectPath("/entries?locales=en&status=review");
  });

  it("leaves them out without read_entry", async () => {
    const page = await openDashboard(["read_locale"]);

    expect(await pageCommands(page)).toEqual([]);
  });
});

describe("scopes commands", () => {
  async function openScopes(permissions: readonly string[]) {
    loginAs(permissions);
    mockRpc("ScopeService/ListScopes", {
      scopes: [
        { id: "s1", name: "Frontend", slug: "frontend", createdAt },
        { id: "s2", name: "Legacy", slug: "legacy", createdAt, deletedAt },
      ],
      pagination: pagination(2),
    });

    return mountPage(ScopesPage, { attach: true });
  }

  it.each([
    [["read_scope"], ["commands.search"]],
    [
      ["read_scope", "create_scope"],
      ["scopes.create", "commands.search"],
    ],
    // Deleted scopes have no tags to manage.
    [
      ["read_scope", "update_tag"],
      ["commands.search", "manageTags"],
    ],
  ])("with %j offers its commands", async (permissions, expected) => {
    const page = await openScopes(permissions);

    expect(await pageCommands(page)).toEqual(
      expected.map((key) =>
        key === "manageTags"
          ? t("commands.manageTagsOf", { scope: "Frontend" })
          : t(key),
      ),
    );
  });

  it("opens the new scope's form", async () => {
    const page = await openScopes(["read_scope", "create_scope"]);

    await runCommand(page, t("scopes.create"));

    expect(page.wrapper.find("dialog[open]").text()).toContain(
      t("scopes.create"),
    );
  });

  it("puts the focus in the search", async () => {
    const page = await openScopes(["read_scope"]);

    await runCommand(page, t("commands.search"));

    expect(document.activeElement?.getAttribute("type")).toBe("search");
  });
});

describe("releases commands", () => {
  it("shows the entries of pending releases", async () => {
    loginAs(["read_release"]);
    mockRpc("ReleaseService/ListReleases", {
      releases: [
        { id: "r1", name: "Autumn" },
        { id: "r2", name: "Spring", releasedAt: createdAt },
      ],
      pagination: pagination(2),
    });

    const page = await mountPage(ReleasesPage, { attach: true });
    const label = t("commands.showReleaseEntries", { release: "Autumn" });

    expect(await pageCommands(page)).toEqual([label]);

    await runCommand(page, label);

    await expectPath("/entries?releases=r1");
  });
});

describe("tasks commands", () => {
  async function openTasks(permissions: readonly string[]) {
    const calls: { method: string; body: Record<string, unknown> }[] = [];

    loginAs(permissions);
    mockRpc("TaskService/ListTasks", {
      tasks: [{ id: "t1", name: "Nightly export", enabled: true }],
    });
    mockRpc("TaskService/GetTaskSettings", { settings: {} });

    for (const method of ["RunTask", "UpdateTaskSettings"]) {
      mockRpc(`TaskService/${method}`, (body) => {
        calls.push({ method, body });

        return method === "RunTask"
          ? { run: { id: "r1", status: "TASK_RUN_STATUS_QUEUED" } }
          : { settings: body };
      });
    }

    const page = await mountPage(TasksPage, { attach: true });

    return { page, calls };
  }

  it.each([
    [["read_task"], []],
    [["read_task", "update_task"], ["commands.pauseTasks"]],
    [["read_task", "run_task"], ["runNow"]],
  ])("with %j offers its commands", async (permissions, expected) => {
    const { page } = await openTasks(permissions);

    expect(await pageCommands(page)).toEqual(
      expected.map((key) =>
        key === "runNow"
          ? t("commands.runTaskNow", { task: "Nightly export" })
          : t(key),
      ),
    );
  });

  it("runs a task", async () => {
    const { page, calls } = await openTasks(["read_task", "run_task"]);

    await runCommand(
      page,
      t("commands.runTaskNow", { task: "Nightly export" }),
    );

    expect(calls).toEqual([{ method: "RunTask", body: { id: "t1" } }]);
  });

  it("pauses all tasks", async () => {
    const { page, calls } = await openTasks(["read_task", "update_task"]);

    await runCommand(page, t("commands.pauseTasks"));

    expect(calls).toEqual([
      { method: "UpdateTaskSettings", body: { paused: true } },
    ]);
  });
});

describe("webhooks commands", () => {
  it("sends a test, with update_webhook", async () => {
    const tests: unknown[] = [];

    loginAs(["read_webhook", "update_webhook"]);
    mockRpc("WebhookService/ListWebhooks", {
      webhooks: [{ id: "w1", name: "Chat", enabled: true }],
    });
    mockRpc("WebhookService/TestWebhook", (body) => {
      tests.push(body);

      return { delivery: { id: "d1" } };
    });

    const page = await mountPage(WebhooksPage, { attach: true });
    const label = t("commands.testWebhook", { webhook: "Chat" });

    expect(await pageCommands(page)).toEqual([label]);

    await runCommand(page, label);

    expect(tests).toEqual([{ id: "w1" }]);
  });

  it("leaves it out for a reader", async () => {
    loginAs(["read_webhook"]);
    mockRpc("WebhookService/ListWebhooks", {
      webhooks: [{ id: "w1", name: "Chat", enabled: true }],
    });

    const page = await mountPage(WebhooksPage, { attach: true });

    expect(await pageCommands(page)).toEqual([]);
  });
});

describe("import and export commands", () => {
  it("switches the tab", async () => {
    loginAs([...VIEWER, "import_entry", "export_entry"]);
    mockRpc("LocaleService/ListLocales", {
      locales,
      pagination: pagination(locales.length),
    });

    const page = await mountPage(TransferPage, {
      route: "/entries/transfer?tab=export",
      attach: true,
    });

    expect(await pageCommands(page)).toEqual([
      t("transfer.importTab"),
      t("transfer.exportTab"),
    ]);

    await runCommand(page, t("transfer.importTab"));

    expect(useRouter().currentRoute.value.query.tab).toBe("import");
    expect(
      (await paletteOptions(page)).find(
        ({ label }) => label === t("transfer.importTab"),
      )?.disabled,
    ).toBe(false);
  });
});
