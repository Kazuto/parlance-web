import { describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import TermChip from "~/components/entry/TermChip.vue";
import { ALL_PERMISSIONS, loginAs, mockRpc, t } from "./helpers";

/** The chip for a source text using the term "Name", German "Name". */
async function chip(translation: string) {
  loginAs(ALL_PERMISSIONS);
  mockRpc("TerminologyService/SuggestTerminologies", {
    suggestions: [
      {
        terminology: { id: "term-1", term: "Name" },
        targetTranslation: "Name",
        matchedWords: ["name"],
      },
    ],
  });

  const wrapper = await mountSuspended(TermChip, {
    props: {
      sourceText: "Your name: {name}.",
      localeId: "de",
      translation,
    },
  });

  await vi.waitFor(() => expect(wrapper.find("button").exists()).toBe(true));

  return wrapper.find("button").attributes("title");
}

describe("glossary chip", () => {
  it("counts the term as used in the text around placeholders", async () => {
    expect(await chip("Dein Name: {name}.")).toBe(
      t("terminologyHints.status.used"),
    );
  });

  it("doesn't count a placeholder of the same name as using the term", async () => {
    expect(await chip("Du heißt {name}.")).toBe(
      t("terminologyHints.status.unused"),
    );
    expect(await chip("Du heißt :name.")).toBe(
      t("terminologyHints.status.unused"),
    );
  });
});
