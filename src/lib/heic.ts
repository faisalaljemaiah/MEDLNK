/**
 * HEIC/HEIF — the default photo format on iPhone — isn't renderable in most
 * non-Safari browsers, so the server-side upload allowlist (src/lib/uploads.ts)
 * rejects it rather than accept a photo most viewers would see as broken.
 * Converting it to JPEG here, client-side, before the file reaches that check
 * means a photo straight off an iPhone still posts.
 *
 * heic-to bundles a ~3MB wasm decoder — imported dynamically so picking a
 * photo is what pays for it, not loading the compose/onboarding form.
 */
export async function toUploadableImage(file: File): Promise<File> {
  const { heicTo, isHeic } = await import("heic-to");

  const heic = await isHeic(file).catch(() => false);
  if (!heic) return file;

  const jpegBlob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
  const name = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";
  return new File([jpegBlob], name, { type: "image/jpeg" });
}
