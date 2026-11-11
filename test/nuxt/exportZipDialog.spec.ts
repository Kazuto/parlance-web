import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { Select } from "@thkzt/eunoia";
import type { VueWrapper } from "@vue/test-utils";
import LocaleExportZipDialog from "~/components/locale/ExportZipDialog.vue";
import LocalesPage from "~/pages/locales/index.vue";
import {
  type ZipExportOptions,
  zipFolderName,
} from "~/composables/export/useZipExport";
import {
  ALL_PERMISSIONS,
  loginAs,
  mockRpc,
  mountPage,
  pagination,
  settle,
  t,
} from "./helpers";

const locales = [
  { id: "l1", code: "en", name: "English", isDefault: true },
  { id: "l2", code: "de", name: "German" },
];

// Mail is exported as PHP by default and Web has no default; both have tags.
const scopes = [
  {
    id: "s1",
    name: "Mail",
    slug: "mail",
    exportFormat: "EXPORT_FORMAT_PHP",
    tags: [{ id: "t1", scopeId: "s1", name: "Billing" }],
  },
  {
    id: "s2",
    name: "Web",
    slug: "web",
    tags: [{ id: "t2", scopeId: "s2", name: "Home" }],
  },
];

function mockLists() {
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
  mockRpc("ScopeService/ListScopes", {
    scopes,
    pagination: pagination(scopes.length),
  });
}

async function openDialog() {
  loginAs(ALL_PERMISSIONS);
  mockLists();

  const wrapper = await mountSuspended(LocaleExportZipDialog, {
    props: { open: false },
  });

  await wrapper.setProps({ open: true });
  await settle();

  return wrapper;
}

/** The select labelled with this text, if it shows. */
const selectLabelled = (wrapper: VueWrapper, label: string) =>
  wrapper
    .findAllComponents(Select)
    .find((select) => select.find("label").text().trim() === label);

async function choose(wrapper: VueWrapper, label: string, value: unknown) {
  selectLabelled(wrapper, label)!.vm.$emit("update:modelValue", value);
  await settle();
}

const optionLabels = (select: VueWrapper) =>
  (select.props() as { options: { label: string }[] }).options.map(
    (option) => option.label,
  );

async function exportZip(wrapper: VueWrapper) {
  await wrapper
    .findAll("dialog[open] button")
    .find((button) => button.text().trim() === t("export.zip.export"))!
    .trigger("click");

  return wrapper.emitted<[ZipExportOptions]>("export")?.at(-1)?.[0];
}

describe("ZIP export dialog", () => {
  it("exports every language as flat JSON by default", async () => {
    const wrapper = await openDialog();

    expect(wrapper.text()).toContain(
      t("export.zip.layoutFlat", { file: "en.json" }),
    );
    expect(selectLabelled(wrapper, t("tags.title"))).toBeUndefined();
    expect(await exportZip(wrapper)).toEqual({
      localeIds: [],
      scopeIds: [],
      tagIds: [],
      format: "EXPORT_FORMAT_JSON",
      includeDrafts: false,
    });
  });

  it("gives each scope a folder in its default format", async () => {
    const wrapper = await openDialog();

    await choose(wrapper, t("common.languages"), ["l2"]);
    await choose(wrapper, t("common.format"), "EXPORT_FORMAT_PO");
    await choose(wrapper, t("nav.scopes"), ["s1", "s2"]);

    // Mail keeps its PHP; Web, with no default, takes the picked format.
    expect(wrapper.text()).toContain(t("export.zip.layoutScopes"));
    expect(wrapper.text()).toContain("mail/de.php");
    expect(wrapper.text()).toContain("web/de.po");
    expect(
      selectLabelled(wrapper, t("export.zip.fallbackFormat")),
    ).toBeTruthy();

    // With two scopes each tag names its scope.
    const tags = selectLabelled(wrapper, t("tags.title"))!;

    expect(optionLabels(tags)).toEqual([
      t("tags.option", { scope: "Mail", tag: "Billing" }),
      t("tags.option", { scope: "Web", tag: "Home" }),
    ]);

    await choose(wrapper, t("tags.title"), ["t1"]);

    expect(await exportZip(wrapper)).toEqual({
      localeIds: ["l2"],
      scopeIds: ["s1", "s2"],
      tagIds: ["t1"],
      format: "EXPORT_FORMAT_PO",
      includeDrafts: false,
    });
  });

  it("drops a deselected scope's tags", async () => {
    const wrapper = await openDialog();

    await choose(wrapper, t("nav.scopes"), ["s1", "s2"]);
    await choose(wrapper, t("tags.title"), ["t1", "t2"]);
    await choose(wrapper, t("nav.scopes"), ["s2"]);

    expect(optionLabels(selectLabelled(wrapper, t("tags.title"))!)).toEqual([
      "Home",
    ]);
    expect((await exportZip(wrapper))?.tagIds).toEqual(["t2"]);

    await choose(wrapper, t("nav.scopes"), []);

    expect(selectLabelled(wrapper, t("tags.title"))).toBeUndefined();
    expect((await exportZip(wrapper))?.tagIds).toEqual([]);
  });

  it("sends the chosen options from the languages page", async () => {
    const bodies: Record<string, unknown>[] = [];

    loginAs(ALL_PERMISSIONS);
    mockLists();
    mockRpc("StatsService/GetStats", {});
    mockRpc("ExportService/ExportZip", (body) => {
      bodies.push(body);

      return { content: btoa("zip"), filename: "translations.zip" };
    });

    URL.createObjectURL = () => "blob:export";

    URL.revokeObjectURL = () => {};

    const page = await mountPage(LocalesPage);
    const options: ZipExportOptions = {
      localeIds: ["l2"],
      scopeIds: ["s1"],
      tagIds: ["t1"],
      format: "EXPORT_FORMAT_PHP",
      includeDrafts: true,
    };

    page.wrapper
      .findComponent(LocaleExportZipDialog)
      .vm.$emit("export", options);
    await settle();

    expect(bodies).toEqual([options]);
  });
});

describe("ZIP folder names", () => {
  it.each([
    ["backend", "backend"],
    ["../web site", "web-site"],
    ["..", "scope"],
    [".hidden", "hidden"],
    ["Ünïcode_1.0", "n-code_1.0"],
  ])("names %j's folder %j, as the server does", (slug, folder) => {
    expect(zipFolderName(slug)).toBe(folder);
  });
});
