import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { settle } from "./helpers";

type Pair = [string | undefined, string | undefined];

async function mountExamples(pairs: Ref<Pair[]>, search: Ref<string>) {
  let placeholder!: Ref<string>;
  await mountSuspended(
    defineComponent({
      setup() {
        placeholder = useSearchExamples(
          () => pairs.value,
          search,
          () => "Search…",
        );
        return () => h("input", { placeholder: placeholder.value });
      },
    }),
  );
  await settle();
  return placeholder;
}

/** Collects every placeholder text over a while, to see which examples run. */
async function watchFor(placeholder: Ref<string>, ms: number) {
  const seen = new Set<string>();
  const stop = watch(placeholder, (value) => seen.add(value));
  await new Promise((resolve) => setTimeout(resolve, ms));
  stop();
  return [...seen];
}

describe("useSearchExamples", () => {
  it("types each name followed by its text", async () => {
    const pairs = ref<Pair[]>([["a.b", "Hi"]]);
    const placeholder = await mountExamples(pairs, ref(""));

    const seen = await watchFor(placeholder, 3500);
    expect(seen).toContain("a.b");
    expect(seen).toContain("Hi");
  });

  it("skips pairs without a text and keeps at most three", async () => {
    const pairs = ref<Pair[]>([
      ["no.text", undefined],
      ["k1", "T1"],
      ["k2", "T2"],
      ["k3", "T3"],
      ["k4", "T4"],
    ]);
    const placeholder = await mountExamples(pairs, ref(""));

    const seen = await watchFor(placeholder, 300);
    expect(seen.some((value) => value.startsWith("k1"))).toBe(true);
    expect(seen.some((value) => value.startsWith("no"))).toBe(false);
  });

  it("shows the fallback without examples", async () => {
    const placeholder = await mountExamples(ref([]), ref(""));
    expect(placeholder.value).toBe("Search…");
  });

  it("keeps its examples while the user searches", async () => {
    const pairs = ref<Pair[]>([["first.key", "First"]]);
    const search = ref("");
    const placeholder = await mountExamples(pairs, search);

    // Typing narrows the list; the examples must not follow it.
    search.value = "other";
    pairs.value = [["other.key", "Other"]];
    await settle();
    const seen = await watchFor(placeholder, 400);
    expect(seen.every((value) => "first.key".startsWith(value))).toBe(true);
  });
});
