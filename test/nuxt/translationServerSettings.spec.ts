import { describe, expect, it } from "vitest";
import SettingsPage from "~/pages/settings.vue";
import {
  ALL_PERMISSIONS,
  VIEWER,
  loginAs,
  mockRpc,
  mountPage,
  settle,
  t,
  type MountedPage,
} from "./helpers";

// As the API sends them: false and empty values are left out.
const servers = [
  {
    id: "s1",
    name: "Homelab",
    baseUrl: "http://homelab:8080/v1",
    maxConcurrency: 2,
    enabled: true,
  },
  {
    id: "s2",
    name: "Hosted",
    baseUrl: "https://api.example/v1",
    model: "tencent/Hy-MT2-7B",
    hasApiKey: true,
    maxConcurrency: 8,
  },
];

async function openSettings(permissions: readonly string[]) {
  const calls: { method: string; body: Record<string, unknown> }[] = [];
  loginAs(permissions);
  mockRpc("TranslationServerService/ListTranslationServers", {
    translationServers: servers,
  });
  for (const method of [
    "CreateTranslationServer",
    "UpdateTranslationServer",
    "DeleteTranslationServer",
  ]) {
    mockRpc(`TranslationServerService/${method}`, (body) => {
      calls.push({ method, body });
      return { translationServer: servers[0] };
    });
  }
  mockRpc("TranslationServerService/TestTranslationServer", (body) => {
    calls.push({ method: "TestTranslationServer", body });
    return body.id === "s1"
      ? { ok: true, translation: "Änderungen speichern", durationMs: 840 }
      : { ok: false, error: "connection refused" };
  });
  const page = await mountPage(SettingsPage);
  return { page, calls };
}

// Closed dialogs stay in the DOM, so their buttons don't count.
const button = (page: MountedPage, label: string) =>
  page.wrapper
    .findAll("button")
    .filter((item) => !item.element.closest("dialog:not([open])"))
    .find(
      (item) =>
        item.text().trim() === label || item.attributes("aria-label") === label,
    );

const switches = (page: MountedPage) =>
  page.wrapper
    .findAll('input[role="switch"]')
    .filter((item) => !item.element.closest("dialog:not([open])"));

/** The open dialog's form fields, by their label text. */
function dialogField(page: MountedPage, label: string) {
  const dialog = page.wrapper.find("dialog[open]");
  const labelEl = dialog
    .findAll("label")
    .find((item) => item.text().trim().startsWith(label));
  const id = labelEl?.attributes("for");
  return id ? dialog.find(`#${CSS.escape(id)}`) : labelEl!.find("input");
}

describe("translation server settings", () => {
  it("is hidden without read_translation_server", async () => {
    const { page } = await openSettings(VIEWER);

    expect(page.wrapper.text()).not.toContain(t("translationServers.title"));
  });

  it("lists the servers for reading only", async () => {
    const { page } = await openSettings([...VIEWER, "read_translation_server"]);

    expect(page.wrapper.text()).toContain("Homelab");
    expect(page.wrapper.text()).toContain("https://api.example/v1");
    expect(page.wrapper.text()).toContain(t("translationServers.hasApiKey"));
    expect(button(page, t("translationServers.add"))).toBeUndefined();
    expect(button(page, t("translationServers.test"))).toBeUndefined();
    expect(
      button(page, t("translationServers.editFor", { name: "Homelab" })),
    ).toBeUndefined();
    expect(switches(page)).toEqual([]);
  });

  it("adds a server", async () => {
    const { page, calls } = await openSettings(ALL_PERMISSIONS);

    await button(page, t("translationServers.add"))!.trigger("click");
    await settle();
    await dialogField(page, t("common.name")).setValue("Laptop");
    await dialogField(page, t("translationServers.baseUrl")).setValue(
      "http://laptop:8080/v1",
    );
    await dialogField(page, t("translationServers.apiKey")).setValue("sk-1");
    await page.wrapper.find("dialog[open] form").trigger("submit");
    await settle();

    expect(calls).toEqual([
      {
        method: "CreateTranslationServer",
        body: {
          name: "Laptop",
          baseUrl: "http://laptop:8080/v1",
          model: "",
          apiKey: "sk-1",
          maxConcurrency: 2,
          enabled: true,
        },
      },
    ]);
  });

  it("keeps a saved API key unless it is replaced or removed", async () => {
    const { page, calls } = await openSettings(ALL_PERMISSIONS);

    const edit = () =>
      button(page, t("translationServers.editFor", { name: "Hosted" }))!;
    await edit().trigger("click");
    await settle();
    expect(
      dialogField(page, t("translationServers.apiKey")).element,
    ).toHaveProperty("value", "");
    // The server is off, and saving keeps it off.
    expect(
      page.wrapper.find<HTMLInputElement>('dialog[open] input[role="switch"]')
        .element.checked,
    ).toBe(false);
    await page.wrapper.find("dialog[open] form").trigger("submit");
    await settle();
    expect(calls.at(-1)?.body).not.toHaveProperty("apiKey");
    expect(calls.at(-1)?.body).toMatchObject({ enabled: false });

    await edit().trigger("click");
    await settle();
    await page.wrapper
      .find("dialog[open] input[type='checkbox']")
      .setValue(true);
    await page.wrapper.find("dialog[open] form").trigger("submit");
    await settle();
    expect(calls.at(-1)?.body).toMatchObject({ id: "s2", apiKey: "" });
  });

  it("switches a server on and off", async () => {
    const { page, calls } = await openSettings(ALL_PERMISSIONS);

    await switches(page)[0]!.setValue(false);
    await settle();

    expect(calls).toEqual([
      {
        method: "UpdateTranslationServer",
        body: { id: "s1", enabled: false },
      },
    ]);
  });

  it("tests a server and shows the result", async () => {
    const { page } = await openSettings(ALL_PERMISSIONS);
    const tests = page.wrapper
      .findAll("button")
      .filter((item) => item.text().trim() === t("translationServers.test"));

    await tests[0]!.trigger("click");
    await settle();
    expect(page.wrapper.text()).toContain(
      t("translationServers.testOk", {
        translation: "Änderungen speichern",
        ms: 840,
      }),
    );

    await tests[1]!.trigger("click");
    await settle();
    expect(page.wrapper.text()).toContain(
      t("translationServers.testFailed", { error: "connection refused" }),
    );
  });
});
