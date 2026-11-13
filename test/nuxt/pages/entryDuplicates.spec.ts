import { describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { Chip, SplitView } from "@thkzt/eunoia";
import EntriesPage from "~/pages/entries/index.vue";
import EditorListItem from "~/components/editor/ListItem.vue";
import EntryFiltersPopover from "~/components/entry/FiltersPopover.vue";
import {
  VIEWER,
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
];

const localizations = (text: string, german: string) => [
  {
    id: `${text}-en`,
    localeId: "l1",
    translation: text,
    status: "REVIEW_STATUS_APPROVED",
  },
  {
    id: `${text}-de`,
    localeId: "l2",
    translation: german,
    status: "REVIEW_STATUS_APPROVED",
  },
];

const entries = [
  {
    id: "e1",
    key: "settings.save",
    defaultTranslation: "Save your changes",
    scopes: [],
    localizations: localizations("Save your changes", "Speichern"),
  },
  {
    id: "e2",
    key: "profile.save",
    defaultTranslation: "Save your changes",
    scopes: [],
    localizations: localizations("Save your changes", "Sichern"),
  },
];

// Not in the list: the filters may hide a twin.
const hidden = {
  id: "e3",
  key: "form.save",
  scopes: [],
  localizations: localizations("Save your changes now", "Jetzt speichern"),
};

const similar = [
  {
    entryId: "e3",
    key: "form.save",
    text: "Save your changes now",
    similarity: 0.8095238,
  },
  {
    entryId: "e2",
    key: "profile.save",
    text: "Save your changes",
    similarity: 1,
  },
];

type Request = Record<string, unknown>;

async function openEntries(route: string) {
  const lists: Request[] = [];
  const searches: Request[] = [];

  loginAs(VIEWER);
  mockRpc("LocaleService/ListLocales", {
    locales,
    pagination: pagination(locales.length),
  });
  mockRpc("EntryService/ListEntries", (body) => {
    lists.push(body);

    return { entries, pagination: pagination(entries.length) };
  });
  mockRpc("EntryService/GetEntry", (body) => ({
    entry: [...entries, hidden].find((entry) => entry.id === body.id),
  }));
  mockRpc("EntryService/SearchSimilarEntries", (body) => {
    searches.push(body);

    // The server leaves out the entry being edited and sorts by similarity.
    return {
      entries: similar
        .filter((entry) => entry.entryId !== body.excludeEntryId)
        .sort((a, b) => b.similarity - a.similarity),
      sameTextCount: body.excludeEntryId === "e3" ? 0 : 1,
    };
  });

  const page = await mountPage(EntriesPage, { route, attach: true });

  return { page, lists, searches };
}

const details = (page: MountedPage) =>
  (
    page.wrapper.findComponent(SplitView).props("items") as {
      detail?: string;
    }[]
  ).map((item) => item.detail);

const duplicatesChip = (page: MountedPage, label: string) =>
  page.wrapper
    .findAllComponents(Chip)
    .find((chip) => chip.text().includes(label));

const sameTextChips = (page: MountedPage) =>
  page.wrapper
    .findAll("button")
    .filter(
      (button) => button.attributes("title") === t("entries.sameTextHint"),
    );

const sameTextChip = (page: MountedPage) => sameTextChips(page)[0];

const similarList = (page: MountedPage) =>
  page.wrapper.find(`ol[aria-label="${t("context.similar")}"]`);

describe("duplicates filter", () => {
  it("lists twins from a link, each with its default text", async () => {
    const { page, lists } = await openEntries(
      "/entries?locales=en,de&duplicates=same",
    );

    expect(lists.at(-1)).toMatchObject({
      duplicates: "DUPLICATE_FILTER_SAME_TEXT",
    });
    expect(details(page)).toEqual(["Save your changes", "Save your changes"]);

    duplicatesChip(page, t("entries.duplicatesSame"))!.vm.$emit("remove");
    await settle();

    expect(lists.at(-1)).not.toHaveProperty("duplicates");
    expect(details(page)).toEqual([undefined, undefined]);
    expect(useRouter().currentRoute.value.query).not.toHaveProperty(
      "duplicates",
    );
  });

  it("finds differing translations in the languages the status checks", async () => {
    const { page, lists } = await openEntries("/entries?locales=en,de");

    expect(lists.at(-1)).not.toHaveProperty("duplicates");

    page.wrapper
      .findComponent(EntryFiltersPopover)
      .vm.$emit("update:duplicates", "different");
    await settle();

    expect(lists.at(-1)).toMatchObject({
      duplicates: "DUPLICATE_FILTER_TRANSLATED_DIFFERENTLY",
      statusLocaleIds: ["l2"],
    });
    expect(useRouter().currentRoute.value.query).toMatchObject({
      duplicates: "different",
    });
    expect(
      duplicatesChip(page, t("entries.duplicatesDifferent"))?.exists(),
    ).toBe(true);
  });

  it("shows the shared text under each key", async () => {
    const item = await mountSuspended(EditorListItem, {
      props: {
        label: "settings.save",
        detail: "Save your changes",
        missingCount: 0,
        missingLabel: "",
      },
    });

    expect(item.text()).toContain("settings.save");
    expect(item.text()).toContain("Save your changes");
  });

  it("ignores an unknown value in a link", async () => {
    const { page, lists } = await openEntries(
      "/entries?locales=en,de&duplicates=constructor",
    );

    expect(lists.at(-1)).not.toHaveProperty("duplicates");
    expect(page.wrapper.findComponent(SplitView).exists()).toBe(true);
  });
});

describe("twins in the editor", () => {
  it("counts the entries with the same default text and lists the similar ones", async () => {
    const { page, searches } = await openEntries("/entries?locales=en,de");

    await vi.waitFor(() => expect(sameTextChip(page)).toBeDefined());

    expect(searches.at(-1)).toEqual({
      text: "Save your changes",
      excludeEntryId: "e1",
      limit: 10,
    });
    expect(sameTextChip(page)!.text()).toBe(
      t("entries.sameText", { count: 1 }, 1),
    );
    // Only the default language has twins.
    expect(sameTextChips(page)).toHaveLength(1);

    await sameTextChip(page)!.trigger("click");
    await settle();
    await vi.waitFor(() => expect(similarList(page).exists()).toBe(true));

    const items = similarList(page)
      .findAll("li")
      .map((item) => item.text());

    expect(items).toHaveLength(2);
    expect(items[0]).toContain("profile.save");
    expect(items[0]).toContain("100%");
    expect(items[1]).toContain("form.save");
    expect(items[1]).toContain("Save your changes now");
    expect(items[1]).toContain("81%");
  });

  it("opens a twin the list doesn't show", async () => {
    const { page } = await openEntries("/entries?locales=en,de");

    await vi.waitFor(() => expect(sameTextChip(page)).toBeDefined());
    await sameTextChip(page)!.trigger("click");
    await vi.waitFor(() => expect(similarList(page).exists()).toBe(true));

    await similarList(page)
      .find(
        `button[aria-label="${t("context.openSimilar", { key: "form.save" })}"]`,
      )
      .trigger("click");
    await settle();

    await vi.waitFor(() =>
      expect(
        page.wrapper.find<HTMLTextAreaElement>("#entry-e3-l1").element.value,
      ).toBe("Save your changes now"),
    );
    // Its own twins replace the first entry's; none has its text.
    await vi.waitFor(() => expect(sameTextChip(page)).toBeUndefined());
  });
});
