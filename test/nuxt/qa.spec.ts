import { describe, expect, it } from "vitest";
import { checkTranslation } from "~/lib/qa";

const codes = (source: string, translation: string) =>
  checkTranslation(source, translation).map(({ code, detail }) =>
    detail ? `${code} ${detail}` : code,
  );

describe("translation checks", () => {
  // The cases of the server's checks of machine translations (clean_test.go).
  it.each([
    ["Hello {name}", "Hallo {name}", []],
    [
      "{count} items",
      "{Anzahl} Einträge",
      ["PLACEHOLDER_MISSING {count}", "PLACEHOLDER_UNEXPECTED {Anzahl}"],
    ],
    ["One item | {count} items", "{count} Einträge", ["PLURAL_FORMS"]],
    ["Save", "Speichern\nSichern", ["LINE_BREAKS"]],
  ])("checks %j against %j like the server", (source, translation, want) => {
    expect(codes(source, translation)).toEqual(want);
  });

  it("knows printf and Laravel placeholders", () => {
    expect(codes("%s of %1$d files", "%s von Dateien")).toEqual([
      "PLACEHOLDER_MISSING %1$d",
    ]);
    expect(codes("Welcome, :name", "Willkommen, :Name")).toEqual([
      "PLACEHOLDER_MISSING :name",
      "PLACEHOLDER_UNEXPECTED :Name",
    ]);
  });

  it.each([
    ["Opens at 10:30", "Öffnet um 10:30"],
    ["See https://parlance.dev", "Siehe https://parlance.dev"],
    ["100% done", "100 % fertig"],
    ["50%% off", "50 %% Rabatt"],
    ["Note: read this", "Hinweis: lies das"],
  ])("takes no text in %j for a placeholder", (source, translation) => {
    expect(codes(source, translation)).toEqual([]);
  });

  it("compares spacing at the edges", () => {
    expect(codes(" Save", "Speichern")).toEqual(["WHITESPACE_START"]);
    expect(codes("Save ", "Speichern")).toEqual(["WHITESPACE_END"]);
    // A break at the end is spacing, not an added line.
    expect(codes("Save", "Speichern\n")).toEqual(["WHITESPACE_END"]);
  });

  it("compares markup, ignoring attributes", () => {
    expect(codes("<b>Save</b> now", "<b>Jetzt</b> speichern")).toEqual([]);
    expect(
      codes('<a href="/help">Help</a>', '<a href="/hilfe">Hilfe</a>'),
    ).toEqual([]);
    expect(codes("<b>Save</b> now", "Jetzt speichern</b>")).toEqual([
      "TAG_MISSING <b>",
    ]);
    expect(codes("Line<br>break", "Zeilen<br/>umbruch<br>")).toEqual([
      "TAG_UNEXPECTED <br>",
    ]);
    expect(codes("a < b > c", "a < b > c")).toEqual([]);
  });

  it("compares how the text ends", () => {
    expect(codes("Delete?", "Löschen")).toEqual(["PUNCTUATION_END ?"]);
    expect(codes("Saved", "Gespeichert.")).toEqual(["PUNCTUATION_END"]);
    expect(codes("Saved.", "保存しました。")).toEqual([]);
    expect(codes("Loading...", "Laden…")).toEqual([]);
    // Some languages end differently; any mark at all is left to the reviewer.
    expect(codes("Delete?", "Διαγραφή;")).toEqual([]);
  });

  it("checks nothing while either text is empty", () => {
    expect(codes("Hello {name}", "")).toEqual([]);
    expect(codes("  ", "Hallo")).toEqual([]);
  });
});
