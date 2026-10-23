import { useMutation } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { base64ToBlob, downloadBlob } from "~/lib/files";

export function useZipExport() {
  const { t } = useI18n();
  const { mutateAsync, isPending } = useMutation({
    ...api.exports.exportZip.use(),
  });

  async function exportZip(scopeIds: string[] = []) {
    const response = await mutateAsync({ scopeIds });

    if (!response.content || !response.filename) {
      throw new Error(t("transfer.missingExportContent"));
    }

    downloadBlob(
      base64ToBlob(response.content, "application/zip"),
      response.filename,
    );
  }

  return {
    exportZip,
    isPending,
  };
}
