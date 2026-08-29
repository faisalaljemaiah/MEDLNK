-- Security fix: neither storage bucket set file_size_limit or
-- allowed_mime_types, and the app trusts the client-supplied File.type
-- (trivially spoofable in a crafted multipart request) as the object's
-- stored Content-Type. Both buckets are public, so the practical effect was:
-- any verified member (case-images) or any signed-up member (avatars) could
-- upload an arbitrary file, label it with an arbitrary Content-Type, and get
-- back a public URL on the project's own Supabase domain — a foothold for
-- hosting phishing pages or script-bearing content under trusted
-- infrastructure, plus no cap on abuse via repeated large uploads.
--
-- This is enforced at the bucket level (belt) in addition to the
-- application-level allowlist added alongside this migration in
-- src/lib/uploads.ts (suspenders) — the app check gives a friendly error
-- message before the request is even sent; the bucket setting is what
-- actually holds if that check is ever bypassed, same reasoning as every
-- other write path in this schema treating RLS/storage config as the real
-- boundary rather than the UI.
--
-- SVG is deliberately excluded from both lists: an SVG can carry an embedded
-- <script>, so "image upload" accepting SVG is a stored-XSS vector dressed up
-- as a picture format.

update storage.buckets
set file_size_limit = 8388608, -- 8 MiB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id in ('case-images', 'avatars');
