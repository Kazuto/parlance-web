import { describe, expect, it } from "vitest";
import { Select } from "@thkzt/eunoia";
import EntriesPage from "~/pages/entries/index.vue";
import LocalesPage from "~/pages/locales/index.vue";
import {
  VIEWER,
  loginAs,
  mockRpc,
  mountPage,
  pageCommands,
  pagination,
  runCommand,
  settle,
  t,
  type MountedPage,
} from "../helpers";

const createdAt = "2026-09-01T10:00:00Z";
const locales = [
  { id: "l1", code: "en", name: "English", isDefault: true, createdAt },
  { id: "l2", code: "de", name: "German", createdAt },
];

const TRANSLATOR = [...VIEWER, "update_entry", "use_machine_translation"];

type Request = Record<string, unknown>;

async function openLocales(
  permissions: readonly string[] = TRANSLATOR,
  counts = { count: 3, pending: 0 },
) {
  const calls: Request[] = [];

  loginAs(permissions);
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
  mockRpc("StatsService/GetStats", {});
  mockRpc("LocalizationService/RetranslateLocalizations", (body) => {
    calls.push(body as Request);

    return body.dryRun ? counts : { count: counts.count, pending: 0 };
  });

  const page = await mountPage(LocalesPage, { attach: true });

  return { page, calls };
}

const retranslateButtons = (page: MountedPage) =>
  page.iconButtons().filter((label) => label === t("locales.retranslate"));

async function openDialog(page: MountedPage) {
  await page.wrapper
    .find(`button[aria-label="${t("locales.retranslate")}"]`)
    .trigger("click");
  await settle();

  return page.wrapper.find("dialog[open]");
}

const dialogButton = (page: MountedPage, label: string) =>
  page.wrapper
    .findAll("dialog[open] button")
    .find((button) => button.text().trim() === label)!;

describe("retranslating a language", () => {
  it("is offered for the other languages with machine translation", async () => {
    const { page } = await openLocales();

    // Not for English, the default language the others are translated from.
    expect(retranslateButtons(page)).toHaveLength(1);
    page.wrapper.unmount();

    const editor = await openLocales([...VIEWER, "update_entry"]);

    expect(retranslateButtons(editor.page)).toEqual([]);
    editor.page.wrapper.unmount();

    const viewer = await openLocales(VIEWER);

    expect(retranslateButtons(viewer.page)).toEqual([]);
  });

  it("counts what the choice marks, then marks it", async () => {
    const { page, calls } = await openLocales();
    const dialog = await openDialog(page);

    expect(dialog.text()).toContain(
      t("locales.retranslateTitle", { language: "German" }),
    );
    expect(calls).toEqual([
      { localeId: "l2", scopeIds: [], includeHuman: false, dryRun: true },
    ]);
    expect(dialog.find('[data-testid="retranslate-count"]').text()).toBe(
      t("locales.retranslateCount", { count: 3 }, 3),
    );
    // Nothing waits yet, so there are no marks to take back.
    expect(dialog.find('[data-testid="retranslate-pending"]').exists()).toBe(
      false,
    );

    // People's translations too
    const texts = page.wrapper
      .findAllComponents(Select)
      .find(
        (select) =>
          !!select.element.closest?.("dialog[open]") &&
          select.text().includes(t("locales.retranslateTexts")),
      )!;

    texts.vm.$emit("update:modelValue", "all");
    await settle();

    expect(calls.at(-1)).toEqual({
      localeId: "l2",
      scopeIds: [],
      includeHuman: true,
      dryRun: true,
    });

    await dialogButton(page, t("locales.retranslate")).trigger("click");
    await settle();

    expect(calls.at(-1)).toEqual({
      localeId: "l2",
      scopeIds: [],
      includeHuman: true,
    });
    expect(page.wrapper.find("dialog[open]").exists()).toBe(false);
  });

  it("takes the marks back", async () => {
    const { page, calls } = await openLocales(TRANSLATOR, {
      count: 0,
      pending: 2,
    });
    const dialog = await openDialog(page);

    expect(dialog.find('[data-testid="retranslate-pending"]').text()).toBe(
      t("locales.retranslatePending", { count: 2 }, 2),
    );
    // Nothing new to mark
    expect(
      dialogButton(page, t("locales.retranslate")).attributes("disabled"),
    ).toBeDefined();

    await dialogButton(page, t("locales.retranslateCancel")).trigger("click");
    await settle();

    expect(calls.at(-1)).toEqual({
      localeId: "l2",
      scopeIds: [],
      includeHuman: false,
      cancel: true,
    });
    expect(page.wrapper.find("dialog[open]").exists()).toBe(false);
  });

  it("is in the palette", async () => {
    const { page } = await openLocales();

    expect(await pageCommands(page)).toContain(
      t("commands.retranslateLanguage", { language: "German" }),
    );
    expect(await pageCommands(page)).not.toContain(
      t("commands.retranslateLanguage", { language: "English" }),
    );

    await runCommand(
      page,
      t("commands.retranslateLanguage", { language: "German" }),
    );

    expect(page.wrapper.find("dialog[open]").text()).toContain(
      t("locales.retranslateTitle", { language: "German" }),
    );
  });
});

describe("marked translations in the editor", () => {
  it("are tagged as queued", async () => {
    const entry = {
      id: "e1",
      key: "greeting",
      scopes: [],
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
          retranslate: true,
        },
      ],
    };

    loginAs(VIEWER);
    mockRpc("LocaleService/ListLocales", {
      locales,
      pagination: pagination(locales.length),
    });
    mockRpc("EntryService/ListEntries", {
      entries: [entry],
      pagination: pagination(1),
    });
    mockRpc("EntryService/GetEntry", { entry });

    const page = await mountPage(EntriesPage, {
      route: "/entries?locales=en,de",
    });
    const tags = page.wrapper
      .findAll("span")
      .filter((span) => span.text() === t("review.retranslate"));

    expect(tags).toHaveLength(1);
  });
});
