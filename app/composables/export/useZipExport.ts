import { useMutation } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export function useZipExport() {
  const { mutateAsync, isPending } = useMutation({
    ...api.exports.exportZip.use(),
  });

  async function exportZip(scopeIds: string[] = []) {
    const response = await mutateAsync({ scopeIds });

    if (!response.content || !response.filename) {
      throw new Error("Invalid export response");
    }

    // Convert base64 to blob
    const bytes = Uint8Array.from(atob(response.content), (c) =>
      c.charCodeAt(0),
    );
    const blob = new Blob([bytes], { type: "application/zip" });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = response.filename;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  }

  return {
    exportZip,
    isPending,
  };
}
