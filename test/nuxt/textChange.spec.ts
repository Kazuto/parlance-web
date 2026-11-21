import { describe, expect, it } from "vitest";
import { isSmallChange } from "~/lib/textChange";

describe("small changes of a source text", () => {
  it.each([
    ["Hello world", "Hello world!"],
    ["Hello, world", "Hello world"],
    ["hello world", "Hello World"],
    ["Hello  world", "Hello world"],
    ["You will recieve an email", "You will receive an email"],
    ["Teh file was deleted", "The file was deleted"],
    ["Settigns", "Settings"],
    ["Hello {name}!", "Hello, {name}."],
    ["Pick a <b>colour</b>", "Pick a <b>color</b>"],
  ])("counts %j to %j as a fix", (before, after) => {
    expect(isSmallChange(before, after)).toBe(true);
  });

  it.each([
    ["Hello world", "Goodbye world"],
    ["Enable sync", "Disable sync"],
    ["Settings", "Setup"],
    ["Turn it on", "Turn it off"],
    ["Show 5 items", "Show 6 items"],
    ["Hello {name}", "Hello {names}"],
    ["Hello %s", "Hello %d"],
    ["Pick a <b>colour</b>", "Pick a <i>colour</i>"],
    ["Hello\nworld", "Hello world"],
    ["", "Hello"],
    ["Hello", ""],
    ["Hello", "Hello"],
  ])("counts %j to %j as a new text", (before, after) => {
    expect(isSmallChange(before, after)).toBe(false);
  });

  it("allows more edits in longer texts, up to three", () => {
    const sentence =
      "Your changes are saved automatically every few minutes while you work";

    expect(
      isSmallChange(
        sentence,
        sentence.replace("automatically", "automaticaly"),
      ),
    ).toBe(true);
    expect(
      isSmallChange(sentence, sentence.replace("every few", "every two")),
    ).toBe(false);
  });
});
