/**
 * Downscales a photo in the browser before it's uploaded through a server
 * action. Vercel caps a function's request body at ~4.5MB regardless of
 * next.config's serverActions.bodySizeLimit, and a full-resolution phone
 * photo can be bigger than that — so a camera shot of a license would fail
 * with a raw 413 instead of uploading. 2400px on the long edge at JPEG 0.85
 * keeps a document comfortably readable at well under 1MB.
 *
 * Small files are returned untouched, as is anything that fails to decode
 * (the server-side validation still has the final say).
 */
export async function shrinkImageForUpload(
  file: File,
  { maxDimension = 2400, quality = 0.85, skipBelowBytes = 1_500_000 } = {},
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= skipBelowBytes) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
