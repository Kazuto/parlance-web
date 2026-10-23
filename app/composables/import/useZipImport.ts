import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { invalidateTranslationData } from "~/lib/api/invalidation";
import { fileToBase64 } from "~/lib/files";
import type { ImportMode } from "~/lib/api/schemas/parlance/v1/ImportSchema";

export function useZipImport() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    ...api.imports.importZip.use(),
    onSuccess: () => invalidateTranslationData(queryClient),
  });

  async function importZip(
    file: File,
    scopeIds: string[] = [],
    mode: ImportMode = "IMPORT_MODE_CREATE_OR_UPDATE",
  ) {
    return await mutateAsync({
      fileContent: await fileToBase64(file),
      scopeIds,
      mode,
    });
  }

  return {
    importZip,
    isPending,
  };
}
