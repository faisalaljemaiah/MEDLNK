"use client";

import { useActionState, useRef, useState } from "react";
import { updateProfileAction } from "@/app/actions/profile";
import { ROLES } from "@/lib/roles";
import { COUNTRIES } from "@/lib/countries";
import { toUploadableImage } from "@/lib/heic";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Avatar } from "@/components/avatar";
import type { Profile } from "@/lib/database.types";

export function OnboardingForm({
  profile,
  documentUploadAvailable,
  resubmissionLocked = false,
}: {
  profile: Profile;
  /** False on a project that hasn't applied 0027 yet — hides the upload
   *  section entirely rather than showing a control that would silently
   *  no-op, and it reappears on its own once the migration lands. */
  documentUploadAvailable: boolean;
  /** True only when rejected and out of resubmission attempts (0033) — the
   *  license number and document are disabled so the only submit that can
   *  go through is one that doesn't touch either, since the server-side
   *  trigger would reject a resubmission attempt anyway. Everything else
   *  (name, handle, specialty, photo) stays editable. */
  resubmissionLocked?: boolean;
}) {
  const [state, action] = useActionState(updateProfileAction, undefined);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [convertingAvatar, setConvertingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const input = avatarInputRef.current;
    if (!file || !input) return;

    setConvertingAvatar(true);
    try {
      const uploadable = await toUploadableImage(file);
      if (uploadable !== file) {
        const transfer = new DataTransfer();
        transfer.items.add(uploadable);
        input.files = transfer.files;
      }
      setAvatarPreview(URL.createObjectURL(uploadable));
    } catch {
      setAvatarPreview(URL.createObjectURL(file));
    } finally {
      setConvertingAvatar(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2">
        <Avatar
          avatarUrl={avatarPreview ?? profile.avatar_url}
          name={profile.full_name}
          size="lg"
        />
        <label
          htmlFor="avatar"
          className="cursor-pointer text-sm font-medium text-accent"
        >
          {profile.avatar_url ? "Change photo" : "Add a photo"}
        </label>
        <input
          ref={avatarInputRef}
          id="avatar"
          name="avatar"
          type="file"
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={handleAvatarChange}
        />
        {convertingAvatar && (
          <p className="text-xs text-muted">Converting photo…</p>
        )}
      </div>
      <TextField
        label="Full name"
        name="full_name"
        defaultValue={profile.full_name ?? ""}
        placeholder="Jane Doe, PharmD"
        required
      />
      <TextField
        label="Handle"
        name="handle"
        defaultValue={profile.handle ?? ""}
        placeholder="jane_pharmd"
        pattern="[a-zA-Z0-9_]+"
        minLength={3}
        required
      />
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="role"
          className="font-label text-xs uppercase tracking-wide text-muted"
        >
          Role
        </label>
        <select
          id="role"
          name="role"
          defaultValue={profile.role ?? ""}
          required
          className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-text focus:border-accent focus:outline-none"
        >
          <option value="" disabled>
            Select a role
          </option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>
      <TextField
        label="Specialty"
        name="specialty"
        defaultValue={profile.specialty ?? ""}
        placeholder="Internal Medicine"
      />
      <TextField
        label="City"
        name="city"
        defaultValue={profile.city ?? ""}
        placeholder="Riyadh"
      />
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="country_code"
          className="font-label text-xs uppercase tracking-wide text-muted"
        >
          Country
        </label>
        <select
          id="country_code"
          name="country_code"
          defaultValue={profile.country_code ?? ""}
          className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-text focus:border-accent focus:outline-none"
        >
          <option value="">Prefer not to say</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">
          Where you practice, not a hospital or unit — this is what tags
          your cases in the Global Case Exchange, so it can&apos;t be
          changed per post.
        </p>
      </div>
      <TextField
        label="License number"
        name="license_number"
        defaultValue={profile.license_number ?? ""}
        placeholder="Used for manual verification only"
        required
        // readOnly, not disabled — a disabled field is excluded from the
        // submitted FormData entirely, which would both fail the "required"
        // check server-side and (since profile.ts compares the submitted
        // value against the existing one to detect a resubmission) read as
        // license_number having changed to empty. readOnly still submits
        // the current value while blocking edits.
        readOnly={resubmissionLocked}
        className={resubmissionLocked ? "opacity-60" : undefined}
      />
      {documentUploadAvailable && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="license_document"
            className="font-label text-xs uppercase tracking-wide text-muted"
          >
            License or proof of study
          </label>
          <input
            id="license_document"
            name="license_document"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            required={!profile.license_document_path}
            disabled={resubmissionLocked}
            className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-text disabled:opacity-50"
          />
          <p className="text-xs text-muted">
            {resubmissionLocked
              ? "Locked until your next resubmission window opens — see above."
              : profile.license_document_path
                ? "Document on file — choose a new one only if you need to replace it."
                : "A photo or PDF of your professional license or student ID. Reviewed manually, never shown publicly."}
          </p>
        </div>
      )}
      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton disabled={convertingAvatar}>Save profile</SubmitButton>
    </form>
  );
}
