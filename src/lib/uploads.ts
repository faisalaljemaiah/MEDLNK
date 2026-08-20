/**
 * Shared image-upload validation for case photos and avatars (0020).
 *
 * This is the friendly half of the fix: it gives a clear error before the
 * request is even sent. The bucket-level file_size_limit/allowed_mime_types
 * set in 0020 are what actually hold if this is ever bypassed — same
 * "RLS/storage config is the real boundary, the app check is a courtesy"
 * split as everywhere else uploads or writes happen in this codebase.
 *
 * SVG is deliberately not in this list: an SVG can carry an embedded
 * <script>, so accepting it as an "image" is a stored-XSS vector.
 */
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MiB, matches the bucket limit

export type ImageValidation =
  | { ok: true; ext: string }
  | { ok: false; error: string };

/**
 * Validates an uploaded image and returns the extension to store it under —
 * derived from the checked MIME type, not the client-supplied filename, so
 * the stored object name never carries attacker-chosen text.
 */
export function validateImageUpload(file: File): ImageValidation {
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) {
    return {
      ok: false,
      error: "Images only — JPEG, PNG, WebP or GIF.",
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Images must be 8MB or smaller." };
  }
  return { ok: true, ext };
}

/**
 * Same shape as the image allowlist above, for video posts (0022) — checked
 * against the case-videos bucket's own file_size_limit/allowed_mime_types,
 * which is what actually holds if this client-side check is bypassed.
 */
const ALLOWED_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MiB, matches the bucket limit

export function validateVideoUpload(file: File): ImageValidation {
  const ext = ALLOWED_VIDEO_TYPES[file.type];
  if (!ext) {
    return {
      ok: false,
      error: "Videos only — MP4, WebM or MOV.",
    };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return { ok: false, error: "Videos must be 50MB or smaller." };
  }
  return { ok: true, ext };
}
