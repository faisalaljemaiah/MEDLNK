const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];

/**
 * cases.media_url can point at either the case-images or case-videos bucket
 * (0022) — the extension is enough to tell which, since it's always assigned
 * server-side from a checked MIME type (see validateVideoUpload), never from
 * client-supplied text.
 */
export function isVideoUrl(url: string): boolean {
  const path = url.split("?")[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => path.endsWith(ext));
}
