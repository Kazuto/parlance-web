import { describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ImportZipDialog from "~/components/locale/ImportZipDialog.vue";
import { ALL_PERMISSIONS, loginAs, mockRpc, settle, t } from "./helpers";

// The dry run of a ZIP with an English and a German file, and one for a language
// that doesn't exist.
const preview = {
  results: [
    {
      localeCode: "en",
      result: {
        entriesUpdated: 1,
        translationsChanged: 1,
        translationsOutdated: 1,
        changes: [
          {
            key: "greeting",
            action: "IMPORT_CHANGE_ACTION_CHANGE",
            oldTranslation: "Hello",
            newTranslation: "Hi",
          },
        ],
      },
    },
    {
      localeCode: "de",
      result: {
        entriesUpdated: 1,
        translationsChanged: 1,
        changes: [
          {
            key: "greeting",
            action: "IMPORT_CHANGE_ACTION_CHANGE",
            oldTranslation: "Hallo",
            newTranslation: "Hi {name}",
            sourceTranslation: "Hi",
          },
        ],
      },
    },
    { localeCode: "xx", error: "locale not found: xx" },
  ],
};

// The dry run of a ZIP with files of languages that don't exist: Swedish twice (at
// the top and in a scope's folder) and Brazilian Portuguese, which can be created,
// and a deleted Dutch and a file that names no language.
const missingPreview = {
  results: [
    { localeCode: "en", result: { entriesUpdated: 1 } },
    {
      localeCode: "sv",
      localeMissing: true,
      localeName: "Swedish",
      result: { entriesUpdated: 1, translationsAdded: 1 },
    },
    {
      localeCode: "pt-BR",
      localeMissing: true,
      localeName: "Brazilian Portuguese",
      result: { entriesUpdated: 1, translationsAdded: 1 },
    },
    {
      localeCode: "nl",
      localeMissing: true,
      localeName: "Dutch",
      missingReason: "MISSING_LOCALE_REASON_DELETED",
      error: "language nl was deleted",
    },
    {
      localeCode: "readme",
      localeMissing: true,
      localeName: "readme",
      missingReason: "MISSING_LOCALE_REASON_INVALID_CODE",
      error: "readme is no known language code",
    },
    {
      localeCode: "sv",
      localeMissing: true,
      localeName: "Swedish",
      result: { entriesUpdated: 1, translationsAdded: 1 },
    },
  ],
};

async function openDialog({
  dryRun = preview as unknown,
  imported = preview as unknown,
  permissions = ALL_PERMISSIONS as readonly string[],
} = {}) {
  const calls: Record<string, unknown>[] = [];
  const toasts = { add: vi.fn(), dismiss: vi.fn(), dismissAll: vi.fn() };

  loginAs(permissions);
  mockRpc("ImportService/ImportZip", (body) => {
    calls.push(body as Record<string, unknown>);

    return body.dryRun ? dryRun : imported;
  });

  const wrapper = await mountSuspended(ImportZipDialog, {
    props: { open: false },
    global: { provide: { toastStack: ref(toasts) } },
  });

  await wrapper.setProps({ open: true });
  await settle();

  const input = wrapper.find<HTMLInputElement>(
    "dialog[open] input[type='file']",
  );

  Object.defineProperty(input.element, "files", {
    value: [new File(["zip"], "all.zip", { type: "application/zip" })],
  });
  await input.trigger("change");
  await settle();

  return { wrapper, calls, toasts };
}

type Wrapper = Awaited<ReturnType<typeof openDialog>>["wrapper"];

async function click(wrapper: Wrapper, label: string) {
  await wrapper
    .findAll("dialog[open] button")
    .find((button) => button.text().trim() === label)!
    .trigger("click");
  await settle();
}

describe("ZIP import dialog", () => {
  it("previews each file before importing", async () => {
    const { wrapper, calls } = await openDialog();

    await click(wrapper, t("transfer.preview"));

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ dryRun: true });
    expect(wrapper.emitted("close")).toBeUndefined();

    const file = (name: string) =>
      wrapper.find(`section[aria-label="${name}"]`);

    // The German text lost no placeholder, but gained one.
    expect(file("English (en)").text()).toContain("Hello");
    expect(file("English (en)").text()).toContain(
      t("importPreview.zipOutdated"),
    );
    expect(file("German (de)").text()).toContain("Hi {name}");
    expect(file("German (de)").text()).toContain(t("entries.suggestionCheck"));
    expect(file("xx").find("[role='alert']").text()).toBe(
      "locale not found: xx",
    );

    // Back to the settings and on again, which asks for a new preview.
    await click(wrapper, t("common.back"));

    expect(wrapper.find("dialog[open] input[type='file']").exists()).toBe(true);

    await click(wrapper, t("transfer.preview"));
    await click(wrapper, t("import.zip.import"));

    expect(calls.map((call) => call.dryRun)).toEqual([true, true, false]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("counts skipped files in the result", async () => {
    const { wrapper, toasts } = await openDialog({
      imported: { ...preview, totalUpdated: 2 },
    });

    await click(wrapper, t("transfer.preview"));
    await click(wrapper, t("import.zip.import"));

    expect(toasts.add).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "danger",
        message: t("import.zip.completedWithSkipped", {
          locales: 2,
          created: 0,
          updated: 2,
          failed: 0,
          skipped: 1,
        }),
      }),
    );
  });

  it("reports a clean import as a success", async () => {
    const { wrapper, toasts } = await openDialog({
      imported: { results: preview.results.slice(0, 2), totalUpdated: 2 },
    });

    await click(wrapper, t("transfer.preview"));
    await click(wrapper, t("import.zip.import"));

    expect(toasts.add).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "success",
        message: t("import.zip.success", {
          locales: 2,
          created: 0,
          updated: 2,
        }),
      }),
    );
  });

  it("creates the missing languages that stay ticked", async () => {
    const { wrapper, calls, toasts } = await openDialog({
      dryRun: missingPreview,
      imported: {
        results: [
          missingPreview.results[0],
          {
            ...missingPreview.results[1],
            localeMissing: false,
            localeCreated: true,
          },
          { localeCode: "pt-BR", localeMissing: true, error: "skipped" },
          missingPreview.results[3],
          missingPreview.results[4],
          {
            ...missingPreview.results[5],
            localeMissing: false,
            localeCreated: true,
          },
        ],
        totalUpdated: 3,
      },
    });

    await click(wrapper, t("transfer.preview"));

    const language = (name: string) =>
      wrapper.find(`section[aria-label="${name}"]`);
    const createBox = (name: string) =>
      language(name).find<HTMLInputElement>("input[type='checkbox']");

    // Both Swedish files are one language, created once; ticked to start with.
    expect(wrapper.findAll(`section[aria-label="Swedish (sv)"]`)).toHaveLength(
      1,
    );
    expect(language("Swedish (sv)").text()).toContain(
      t("import.zip.createLocale", { locale: "Swedish (sv)" }),
    );
    expect(createBox("Swedish (sv)").element.checked).toBe(true);
    expect(createBox("Brazilian Portuguese (pt-BR)").element.checked).toBe(
      true,
    );

    // What blocks a language says how to import its files.
    expect(language("Dutch (nl)").find("[role='alert']").text()).toBe(
      t("import.zip.missing.MISSING_LOCALE_REASON_DELETED", {
        locale: "Dutch (nl)",
        code: "nl",
      }),
    );
    expect(language("readme").find("[role='alert']").text()).toBe(
      t("import.zip.missing.MISSING_LOCALE_REASON_INVALID_CODE", {
        locale: "readme",
        code: "readme",
      }),
    );
    expect(language("Dutch (nl)").find("input[type='checkbox']").exists()).toBe(
      false,
    );

    // Unticked, a language's files are skipped.
    await createBox("Brazilian Portuguese (pt-BR)").setValue(false);
    await settle();

    expect(language("Brazilian Portuguese (pt-BR)").text()).toContain(
      t("import.zip.fileSkipped"),
    );
    expect(
      language("Brazilian Portuguese (pt-BR)").find(".opacity-50").exists(),
    ).toBe(true);

    await click(wrapper, t("import.zip.import"));

    expect(calls.at(-1)).toMatchObject({
      dryRun: false,
      createLocaleCodes: ["sv"],
    });
    expect(toasts.add).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          t("import.zip.localesCreated", { locales: "Swedish (sv)" }),
        ),
      }),
    );
  });

  it("offers to create languages only with the permission", async () => {
    const { wrapper, calls } = await openDialog({
      dryRun: missingPreview,
      permissions: ALL_PERMISSIONS.filter(
        (permission) => permission !== "create_locale",
      ),
    });

    await click(wrapper, t("transfer.preview"));

    expect(wrapper.find("dialog[open] input[type='checkbox']").exists()).toBe(
      false,
    );

    await click(wrapper, t("import.zip.import"));

    expect(calls.at(-1)?.createLocaleCodes ?? []).toEqual([]);
  });
});
