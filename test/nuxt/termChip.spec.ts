import { describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import TermChip from "~/components/entry/TermChip.vue";
import { ALL_PERMISSIONS, loginAs, mockRpc, t } from "./helpers";

/**
 * The chip for a source text using the term "Name", German "Name". The server says
 * whether the translation uses it, as `used` decides; requests are recorded.
 */
async function chip(translation: string, used: boolean) {
  const requests: Record<string, unknown>[] = [];

  loginAs(ALL_PERMISSIONS);
  mockRpc("TerminologyService/SuggestTerminologies", (body) => {
    requests.push(body);

    return {
      suggestions: [
        {
          terminology: { id: "term-1", term: "Name" },
          targetTranslation: "Name",
          matchedWords: ["name"],
          used,
        },
      ],
    };
  });

  const wrapper = await mountSuspended(TermChip, {
    props: {
      sourceText: "Your name: {name}.",
      localeId: "de",
      translation,
    },
  });

  await vi.waitFor(() => expect(wrapper.find("button").exists()).toBe(true));

  return { title: wrapper.find("button").attributes("title"), requests };
}

describe("glossary chip", () => {
  it("asks the server whether the translation uses the term", async () => {
    const { title, requests } = await chip("Deine Namen: {name}.", true);

    expect(title).toBe(t("terminologyHints.status.used"));
    expect(requests.at(-1)).toMatchObject({
      sourceText: "Your name: {name}.",
      targetLocaleId: "de",
      translation: "Deine Namen: {name}.",
    });
  });

  it("shows a term the translation doesn't use", async () => {
    const { title } = await chip("Du heißt {name}.", false);

    expect(title).toBe(t("terminologyHints.status.unused"));
  });
});
