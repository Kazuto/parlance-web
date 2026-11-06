import type { Formality } from "~/lib/api/schemas/parlance/v1/LocaleSchema";

/** The forms of address a language can ask machine translation for. */
export function useFormalityOptions() {
  const { t } = useI18n();

  return computed<{ label: string; value: Formality }[]>(() => [
    { label: t("locales.formalityUnset"), value: "FORMALITY_UNSPECIFIED" },
    { label: t("locales.formalityFormal"), value: "FORMALITY_FORMAL" },
    { label: t("locales.formalityInformal"), value: "FORMALITY_INFORMAL" },
  ]);
}

/** A locale's form of address; the API leaves out the unspecified one. */
export function formalityOf(locale?: { formality?: Formality | null } | null) {
  return locale?.formality ?? "FORMALITY_UNSPECIFIED";
}
