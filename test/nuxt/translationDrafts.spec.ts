import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { useTranslationDrafts } from "~/composables/editor/useTranslationDrafts";
import type { DraftChange } from "~/composables/editor/useTranslationDrafts";
import { settle } from "./helpers";

type Row = { id?: string; localeId?: string; translation?: string };
type Item = { id?: string; rows?: Row[] };

async function setup(
  upsert: (change: DraftChange, existing?: Row) => Promise<Row | undefined>,
) {
  let drafts!: ReturnType<typeof useTranslationDrafts<Item, Row>>;
  const selectedId = ref<string>();
  const afterSave: string[] = [];

  await mountSuspended(
    defineComponent({
      setup() {
        provide("toastStack", ref(null));
        drafts = useTranslationDrafts<Item, Row>({
          name: "test-drafts",
          selectedId,
          rows: (item) => item.rows,
          setRows: (item, rows) => (item.rows = rows),
          upsert,
          describe: (change) => `${change.itemId}/${change.localeId}`,
          messages: { saved: "entries.saved", partial: "entries.partialSave" },
          afterSave: async () => {
            afterSave.push("done");
          },
        });

        return () => h("div");
      },
    }),
  );

  return { drafts, selectedId, afterSave };
}

const item = (): Item => ({
  id: "i1",
  rows: [{ id: "r-en", localeId: "en", translation: "Hello" }],
});

describe("useTranslationDrafts", () => {
  it("keeps drafts when the item reloads", async () => {
    const { drafts, selectedId } = await setup(async () => undefined);

    selectedId.value = "i1";
    drafts.register(item());
    drafts.setForm("i1", "de", "Hallo");

    drafts.register(item());

    expect(drafts.currentForms.value).toEqual({ en: "Hello", de: "Hallo" });
    expect(drafts.unsavedLocaleIds.value).toEqual(["de"]);
    expect(drafts.hasUnsaved("i1")).toBe(true);
  });

  it("takes in newly saved text that was not edited", async () => {
    const { drafts } = await setup(async () => undefined);

    drafts.register(item());
    drafts.register({
      id: "i1",
      rows: [{ id: "r-en", localeId: "en", translation: "Hi" }],
    });

    expect(drafts.forms.value.i1).toEqual({ en: "Hi" });
    expect(drafts.allUnsavedCount.value).toBe(0);
  });

  it("updates existing rows, creates missing ones and remembers both", async () => {
    const calls: [DraftChange, Row | undefined][] = [];
    const { drafts, afterSave } = await setup(async (change, existing) => {
      calls.push([change, existing]);

      return {
        id: `r-${change.localeId}`,
        localeId: change.localeId,
        translation: change.translation,
      };
    });

    drafts.register(item());
    drafts.setForm("i1", "en", "Hello!");
    drafts.setForm("i1", "de", "Hallo");

    await drafts.save([...drafts.allUnsaved.value], "test");
    await settle();

    expect(
      calls.map(([change, existing]) => [change.localeId, existing?.id]),
    ).toEqual([
      ["en", "r-en"],
      ["de", undefined],
    ]);
    expect(drafts.allUnsavedCount.value).toBe(0);
    expect(drafts.known.value.i1?.rows?.map((row) => row.id).sort()).toEqual([
      "r-de",
      "r-en",
    ]);
    expect(afterSave).toEqual(["done"]);
    expect(drafts.isSaving.value).toBe(false);
  });

  it("keeps failed changes unsaved", async () => {
    const { drafts } = await setup(async (change) => {
      if (change.localeId === "de") throw new Error("offline");

      return undefined;
    });

    drafts.register(item());
    drafts.setForm("i1", "en", "Hello!");
    drafts.setForm("i1", "de", "Hallo");

    await drafts.save([...drafts.allUnsaved.value], "test");

    expect(drafts.allUnsaved.value).toEqual([
      { itemId: "i1", localeId: "de", translation: "Hallo" },
    ]);
  });

  it("discards right away only when the open item has all the changes", async () => {
    const { drafts, selectedId } = await setup(async () => undefined);

    selectedId.value = "i1";
    drafts.register(item());
    drafts.register({ id: "i2", rows: [] });
    drafts.setForm("i1", "de", "Hallo");

    drafts.requestDiscardAll();
    expect(drafts.allUnsavedCount.value).toBe(0);

    drafts.setForm("i2", "de", "Welt");
    drafts.requestDiscardAll();
    expect(drafts.showDiscardDialog.value).toBe(true);
    expect(drafts.allUnsavedCount.value).toBe(1);

    drafts.discardChanges();
    expect(drafts.allUnsavedCount.value).toBe(0);
    expect(drafts.showDiscardDialog.value).toBe(false);
  });

  it("forgets deleted items", async () => {
    const { drafts } = await setup(async () => undefined);

    drafts.register(item());
    drafts.setForm("i1", "de", "Hallo");

    drafts.forget("i1");

    expect(drafts.allUnsavedCount.value).toBe(0);
    expect(drafts.known.value.i1).toBeUndefined();
  });
});
