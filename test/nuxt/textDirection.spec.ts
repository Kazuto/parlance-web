import { describe, expect, it } from "vitest";
import { textDirection } from "~/lib/textDirection";

describe("text direction", () => {
  it.each(["ar", "he", "fa", "ur", "ar-EG", "pa-Arab", "ps_AF"])(
    "writes %s right to left",
    (code) => {
      expect(textDirection(code)).toBe("rtl");
    },
  );

  it.each(["en", "de-CH", "ja", "zh_TW", "pa", "az-Latn"])(
    "writes %s left to right",
    (code) => {
      expect(textDirection(code)).toBe("ltr");
    },
  );

  it.each(["", "not a code", "xx"])("leaves %j to the browser", (code) => {
    expect(textDirection(code)).toBe("auto");
  });
});
