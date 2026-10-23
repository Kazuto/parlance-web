/** Reads a file as base64 without loading it into a string first, so large files work. */
export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/** Decodes base64 content into a blob of the given type. */
export function base64ToBlob(content: string, type: string): Blob {
  return new Blob([Uint8Array.from(atob(content), (c) => c.charCodeAt(0))], {
    type,
  });
}

/** Saves a blob as a download named after the last segment of `filename`. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename.split(/[\\/]/).pop() ?? filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
