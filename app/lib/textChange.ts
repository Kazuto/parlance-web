import { placeholders, tags } from "~/lib/qa";

// Tells a small fix of a source text, such as a typo or punctuation, from a change of
// what it says, so the editor can ask before marking its translations outdated.

/** The most single-character edits a small fix makes, however long the text. */
const MAX_EDITS = 3;

/** Whether both lists hold the same values, in any order. */
function sameItems(a: string[], b: string[]) {
  return (
    a.length === b.length &&
    [...a].sort().join("\0") === [...b].sort().join("\0")
  );
}

/** The numbers of a text, e.g. ["5"] in "Show 5 items". */
function numbers(text: string) {
  return text.match(/\p{N}+/gu) ?? [];
}

/** The words of a text, ignoring case, punctuation and spacing. */
function words(text: string) {
  return text
    .normalize("NFC")
    .toLocaleLowerCase()
    .replace(/\p{P}+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * How many single-character edits turn `a` into `b`: inserting, deleting or
 * replacing one, or swapping two neighbours as in "recieve". Past `limit` it stops
 * counting and returns `limit + 1`.
 */
function editDistance(a: string[], b: string[], limit: number) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  // Only cells within `limit` of the diagonal can stay within it.
  const initial = (length: number) =>
    Array.from({ length: length + 1 }, (_, j) => (j <= limit ? j : Infinity));
  let beforePrevious: number[] = [];
  let previous = initial(b.length);

  for (let i = 1; i <= a.length; i++) {
    const row = Array<number>(b.length + 1).fill(Infinity);

    row[0] = i <= limit ? i : Infinity;

    let smallest = row[0];

    for (
      let j = Math.max(1, i - limit);
      j <= Math.min(b.length, i + limit);
      j++
    ) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let edits = Math.min(
        previous[j]! + 1,
        row[j - 1]! + 1,
        previous[j - 1]! + cost,
      );

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        edits = Math.min(edits, beforePrevious[j - 2]! + 1);

      row[j] = edits;
      smallest = Math.min(smallest, edits);
    }

    if (smallest > limit) return limit + 1;

    beforePrevious = previous;
    previous = row;
  }

  return Math.min(previous[b.length]!, limit + 1);
}

/**
 * Whether each changed word is still the same word, misspelt: at most one edit per
 * three letters, so "teh" is "the" but "few" is not "two".
 */
function onlyTypos(before: string, after: string) {
  const from = before.split(" ");
  const to = after.split(" ");

  // Words split or joined; the edits are few, as the caller checked.
  if (from.length !== to.length) return true;

  return from.every((word, index) => {
    const other = [...to[index]!];
    const limit = Math.max(
      1,
      Math.floor(Math.max([...word].length, other.length) / 3),
    );

    return editDistance([...word], other, limit) <= limit;
  });
}

/**
 * Whether changing a source text from `before` to `after` only fixes it: its case,
 * punctuation or spacing, or typos of a few characters, so translations of it likely
 * still fit. Placeholders, markup, numbers and line breaks must stay, as
 * translations repeat them.
 */
export function isSmallChange(before: string, after: string) {
  if (!before.trim() || !after.trim() || before === after) return false;
  if (!sameItems(placeholders(before), placeholders(after))) return false;
  if (!sameItems(tags(before), tags(after))) return false;
  if (!sameItems(numbers(before), numbers(after))) return false;
  if (before.split("\n").length !== after.split("\n").length) return false;

  const from = words(before);
  const to = words(after);
  // One edit per ten characters, at least one and at most MAX_EDITS.
  const limit = Math.min(
    MAX_EDITS,
    Math.max(1, Math.floor(Math.max([...from].length, [...to].length) / 10)),
  );

  return (
    editDistance([...from], [...to], limit) <= limit && onlyTypos(from, to)
  );
}
