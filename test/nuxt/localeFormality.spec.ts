import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { Select } from "@thkzt/eunoia";
import type { VueWrapper } from "@vue/test-utils";
import LocaleCreateDialog from "~/components/locale/CreateDialog.vue";
import LocalesPage from "~/pages/locales/index.vue";
import {
  ALL_PERMISSIONS,
  loginAs,
  mockRpc,
  mountPage,
  pagination,
  settle,
  t,
} from "./helpers";

const german = { id: "l2", code: "de", name: "German" };

/** Picks an option of the form-of-address field in the open dialog. */
async function chooseFormality(wrapper: VueWrapper, label: string) {
  const select = wrapper
    .findAllComponents(Select)
    .find(
      (item) =>
        !!item.element.closest?.("dialog[open]") &&
        item.text().includes(t("locales.formality")),
    )!;
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

    // Only the code: the language is named by it.
    expect(inputs).toHaveLength(1);
    await inputs[0]!.setValue("de");
    expect(wrapper.text()).toContain(t("locales.namedAs", { name: "German" }));
    await chooseFormality(wrapper, t("locales.formalityInformal"));
    await button(wrapper, t("locales.create")).trigger("click");
    await settle();

    expect(calls).toEqual([
      { code: "de", formality: "FORMALITY_INFORMAL", isDefault: false },
    ]);
  });

  it("is changed in the language's edit dialog", async () => {
    const updates: Record<string, unknown>[] = [];
    let stored: Record<string, unknown> = german;

    loginAs(ALL_PERMISSIONS);
    mockRpc("LocaleService/ListLocales", () => ({
      locales: [stored],
      pagination: pagination(1),
    }));
    mockRpc("LocaleService/UpdateLocale", (body) => {
      updates.push(body);
      stored = { ...german, formality: body.formality };

      return { locale: stored };
    });

    const page = await mountPage(LocalesPage);
    const row = () => page.wrapper.find("tbody tr").text();

    expect(row()).not.toContain(t("locales.formalityFormal"));

    await page.wrapper
      .find(`button[aria-label="${t("locales.edit")}"]`)
      .trigger("click");
    await settle();
    await chooseFormality(page.wrapper, t("locales.formalityFormal"));
    await button(page.wrapper, t("common.save")).trigger("click");
    await settle();

    expect(updates).toEqual([
      expect.objectContaining({
        id: "l2",
        code: "de",
        formality: "FORMALITY_FORMAL",
      }),
    ]);
    expect(page.wrapper.find("dialog[open]").exists()).toBe(false);
    expect(row()).toContain(t("locales.formalityFormal"));
  });
});
