import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import type { ImportMode } from "~/lib/api/schemas/parlance/v1/ImportSchema";

export function useZipImport() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    ...api.imports.importZip.use(),
    onSuccess: () => {
      // Invalidate locale-related queries
      queryClient.invalidateQueries({ queryKey: ["locales"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["localizations"] });
    },
  });

  async function importZip(
    file: File,
    scopeIds: string[] = [],
    mode: ImportMode = "IMPORT_MODE_CREATE_OR_UPDATE",
  ) {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Convert to base64
    const base64 = btoa(String.fromCharCode(...bytes));

    return await mutateAsync({
      fileContent: base64,
      scopeIds,
      mode,
    });
  }

  return {
    importZip,
    isPending,
  };
}
