import { useMutation } from "@tanstack/vue-query";
import { api } from "~/lib/api";
import { base64ToBlob, downloadBlob } from "~/lib/files";
import type { ExportFormat } from "~/lib/api/schemas/parlance/v1/TaskSchema";

/** What a ZIP export holds; empty languages or scopes mean all of them. */
export type ZipExportOptions = {
  localeIds: string[];
  scopeIds: string[];
  tagIds: string[];
  /** The flat files' format, and that of scopes without a default */
  format: ExportFormat;
  includeDrafts: boolean;
};

/**
 * The folder a scope's files go in, as the server names it: the slug with
 * anything but letters, digits and . _ - replaced, and never "." or "..".
 */
export function zipFolderName(slug: string) {
  return (
    slug.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "") ||
    "scope"
  );
}

export function useZipExport() {
  const { t } = useI18n();
  const { mutateAsync, isPending } = useMutation({
    ...api.exports.exportZip.use(),
  });

  async function exportZip(options: ZipExportOptions) {
    const response = await mutateAsync(options);

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
