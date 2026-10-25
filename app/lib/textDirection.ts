// Scripts written right to left. maximize() adds a language's likely script, e.g.
// "ar" becomes "ar-Arab-EG", so plain language codes are enough.
const RTL_SCRIPTS = new Set([
  "Adlm",
  "Arab",
  "Hebr",
  "Mand",
  "Nkoo",
  "Rohg",
  "Samr",
  "Syrc",
  "Thaa",
  "Yezi",
]);

/** The writing direction of a language code; "auto" when it can't be told. */
export function textDirection(code: string): "ltr" | "rtl" | "auto" {
  try {
    const script = new Intl.Locale(code.replaceAll("_", "-")).maximize().script;

    if (!script) return "auto";

    return RTL_SCRIPTS.has(script) ? "rtl" : "ltr";
  } catch {
    return "auto";
  }
}
