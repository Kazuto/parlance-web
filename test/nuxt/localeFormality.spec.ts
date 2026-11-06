import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { Select } from "@thkzt/eunoia";
import type { VueWrapper } from "@vue/test-utils";
import LocaleCreateDialog from "~/components/locale/CreateDialog.vue";
import LocalePage from "~/pages/locales/[id].vue";
import {
  ALL_PERMISSIONS,
  loginAs,
  mockRpc,
  mountPage,
  openActionMenu,
  pagination,
  settle,
  t,
} from "./helpers";

const german = {
  id: "l2",
  code: "de",
  name: "German",
  names: { en: "German" },
};

/** Picks an option of the form-of-address field in the open dialog. */
async function chooseFormality(wrapper: VueWrapper, label: string) {
  const select = wrapper
    .findAllComponents(Select)
    .find((item) => item.text().includes(t("locales.formality")))!;
  const option = select
    .props("options")
    .find((item: { label: string }) => item.label === label)!;

  select.vm.$emit("update:modelValue", option.value);
  await settle();
}

const button = (wrapper: VueWrapper, label: string) =>
  wrapper
    .findAll("dialog[open] button, button")
    .find((item) => item.text().trim() === label)!;

describe("form of address", () => {
  it("is chosen when adding a language", async () => {
    const calls: Record<string, unknown>[] = [];

    loginAs(ALL_PERMISSIONS);
    mockRpc("LocaleService/CreateLocale", (body) => {
      calls.push(body);

      return { locale: { ...german, formality: body.formality } };
    });

    const wrapper = await mountSuspended(LocaleCreateDialog, {
      props: { open: false },
      global: { provide: { toastStack: ref(null) } },
    });

    await wrapper.setProps({ open: true });
    await settle();

    const inputs = wrapper.findAll("dialog[open] input[type='text']");

    await inputs[0]!.setValue("de");
    await inputs[1]!.setValue("German");
    await chooseFormality(wrapper, t("locales.formalityInformal"));
    await button(wrapper, t("locales.create")).trigger("click");
    await settle();

    expect(calls).toEqual([
      expect.objectContaining({
        code: "de",
        formality: "FORMALITY_INFORMAL",
      }),
    ]);
  });

  it("is changed on the language's page, as a draft until saved", async () => {
    const updates: Record<string, unknown>[] = [];

    loginAs(ALL_PERMISSIONS);
    mockRpc("LocaleService/ListLocales", {
      locales: [german],
      pagination: pagination(1),
    });
    mockRpc("LocaleService/GetLocale", { locale: german });
    mockRpc("LocaleService/UpdateLocale", (body) => {
      updates.push(body);

      return { locale: { ...german, formality: body.formality } };
    });

    const page = await mountPage(LocalePage, { route: "/locales/l2" });
    const header = () => page.wrapper.find("h2").text();

    expect(header()).not.toContain(t("locales.formalityFormal"));

    const items = await openActionMenu(page, t("locales.actions"));

    await items
      .find((item) => item.label === t("locales.edit"))!
      .item.trigger("click");
    await settle();
    await chooseFormality(page.wrapper, t("locales.formalityFormal"));
    await page.wrapper.find("dialog[open] form").trigger("submit");
    await settle();

    expect(updates).toEqual([]);
    expect(header()).toContain(t("locales.formalityFormal"));
    expect(page.wrapper.text()).toContain(
      t("common.unsavedCount", { count: 1 }),
    );

    await button(page.wrapper, t("common.saveChanges")).trigger("click");
    await settle();

    expect(updates).toEqual([
      expect.objectContaining({ id: "l2", formality: "FORMALITY_FORMAL" }),
    ]);
    expect(header()).toContain(t("locales.formalityFormal"));
  });
});
