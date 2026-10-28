import { useMutation } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { useTranslationDataInvalidation } from "~/lib/api/invalidation";
import { fileToBase64 } from "~/lib/files";
import type { ImportMode } from "~/lib/api/schemas/parlance/v1/ImportSchema";

export function useZipImport() {
  const invalidateTranslationData = useTranslationDataInvalidation();

  // A dry run changes nothing to refresh.
  const { mutateAsync, isPending } = useMutation({
    ...api.imports.importZip.use(),
    onSuccess: (_data, variables) =>
      variables.dryRun ? undefined : invalidateTranslationData(),
  });

  async function importZip(
    file: File,
    scopeIds: string[] = [],
    mode: ImportMode = "IMPORT_MODE_CREATE_OR_UPDATE",
    approve = false,
    dryRun = false,
  ) {
    return await mutateAsync({
      fileContent: await fileToBase64(file),
      scopeIds,
      mode,
      approve,
      dryRun,
    });
  }

  return {
    importZip,
    isPending,
  };
}
