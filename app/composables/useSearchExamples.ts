import { useTypingPlaceholder } from "@thkzt/eunoia";

const MAX_PAIRS = 3;
const MAX_LENGTH = 32;

/** Cuts a long text at a word boundary, so it fits the search field. */
function shorten(text: string) {
  const single = text.replace(/\s+/g, " ").trim();

  if (single.length <= MAX_LENGTH) return single;

  const cut = single.slice(0, MAX_LENGTH - 1);

  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : cut.length)}…`;
}

/**
 * A search placeholder that types out real examples from the list, such as a key
 * and then its text, to show by example that both can be searched.
 *
 * The examples only change while the search is empty: they come from the list,
 * which narrows as the user types, and a placeholder is only seen when empty.
 * Without examples, e.g. before the list loads, it shows the fallback text.
 */
export function useSearchExamples(
  pairs: () => [string | null | undefined, string | null | undefined][],
  search: Ref<string>,
  fallback: () => string,
) {
  const examples = ref<string[]>([]);

  watch(
    pairs,
    (list) => {
      if (search.value) return;

      const next = list
        .filter((pair): pair is [string, string] => !!pair[0] && !!pair[1])
        .slice(0, MAX_PAIRS)
        .flatMap(([name, text]) => [name, shorten(text)]);

      if (next.join("\n") !== examples.value.join("\n")) {
        examples.value = next;
      }
    },
    { immediate: true },
  );

  const { placeholder } = useTypingPlaceholder(examples);

  return computed(() =>
    examples.value.length ? placeholder.value : fallback(),
  );
}
