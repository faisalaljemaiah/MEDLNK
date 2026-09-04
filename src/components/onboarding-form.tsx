"use client";

import { useState, useTransition } from "react";
import { updateProfileAction, type ProfileFormState } from "@/app/actions/profile";
import { ROLES } from "@/lib/roles";
import { COUNTRIES } from "@/lib/countries";
import { citiesForCountry } from "@/lib/cities";
import { toUploadableImage } from "@/lib/heic";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Avatar } from "@/components/avatar";
import { AvatarCropper } from "@/components/avatar-cropper";
import { LICENSE_VERIFICATION_ENABLED } from "@/lib/verification";
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
  const [state, setState] = useState<ProfileFormState>(undefined);
  const [isPending, startTransition] = useTransition();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  // The actual cropped photo to upload, held directly rather than pushed
  // back into the file input's own .files — see handleSubmit for why.
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [convertingAvatar, setConvertingAvatar] = useState(false);
  // Set the moment a photo is picked (post-HEIC-conversion), cleared once the
  // crop step finishes or is cancelled — this is what tells the cropper
  // modal to open, and what it crops.
  const [cropSource, setCropSource] = useState<string | null>(null);
  // Drives which cities the picker below offers — city is scoped to
  // whichever country is currently selected, not a fixed list, so this has
  // to be state rather than an uncontrolled defaultValue like the rest of
  // this form's simpler fields.
  const [countryCode, setCountryCode] = useState(profile.country_code ?? "");
  const availableCities = citiesForCountry(countryCode);
  // A previously saved city that isn't in this country's curated list
  // (a free-typed value from before this became a picker, or a smaller city
  // that isn't listed) still gets its own option — switching to a fixed list
  // shouldn't silently blank out data that was already there.
  const cityOptions =
    profile.city && !availableCities.includes(profile.city)
      ? [profile.city, ...availableCities]
      : availableCities;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setConvertingAvatar(true);
    try {
      const uploadable = await toUploadableImage(file);
      setCropSource(URL.createObjectURL(uploadable));
    } catch {
      setCropSource(URL.createObjectURL(file));
    } finally {
      setConvertingAvatar(false);
    }
  }

  function handleCropped(file: File) {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    if (cropSource) URL.revokeObjectURL(cropSource);
    setCropSource(null);
  }

  function handleCropCancel() {
    if (cropSource) URL.revokeObjectURL(cropSource);
    setCropSource(null);
  }

  // A plain function passed as the form's action, not useActionState — the
  // picked-and-cropped photo has to override whatever the hidden file
  // input's own .files holds, and that input's .files can only be set two
  // ways: the browser's own picker, or reassigning it via a DataTransfer.
  // The DataTransfer route is exactly what the HEIC-conversion step already
  // did before this, and it's what silently broke a real photo upload on at
  // least one device — WebKit's support for writing to .files this way is
  // inconsistent, so the safer fix is to never touch the input's .files at
  // all and instead override the "avatar" entry directly on the FormData
  // this function already receives (every other field's current value is
  // still read the normal way, straight off the DOM).
  function handleSubmit(formData: FormData) {
    if (avatarFile) {
      formData.set("avatar", avatarFile, avatarFile.name);
    }
    startTransition(async () => {
      const result = await updateProfileAction(state, formData);
      setState(result);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2">
        <Avatar
          avatarUrl={avatarPreview ?? profile.avatar_url}
          name={profile.full_name}
          size="lg"
        />
        <label
          htmlFor="avatar-picker"
          className="cursor-pointer text-sm font-medium text-accent"
        >
          {profile.avatar_url ? "Change photo" : "Add a photo"}
        </label>
        {/* No name/required — this only ever feeds the crop step. The file
            that actually gets submitted is whatever handleSubmit sets on
            the FormData above, not this input's own value. */}
        <input
          id="avatar-picker"
          type="file"
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={handleAvatarChange}
        />
        {convertingAvatar && (
          <p className="text-xs text-muted">Converting photo…</p>
        )}
        {cropSource && (
          <AvatarCropper
            imageSrc={cropSource}
            onCancel={handleCropCancel}
            onCropped={handleCropped}
          />
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
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
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
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="city"
          className="font-label text-xs uppercase tracking-wide text-muted"
        >
          City (optional)
        </label>
        <select
          id="city"
          name="city"
          defaultValue={profile.city ?? ""}
          disabled={cityOptions.length === 0}
          className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-text focus:border-accent focus:outline-none disabled:opacity-50"
        >
          <option value="">Prefer not to say</option>
          {cityOptions.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        {cityOptions.length === 0 && (
          <p className="text-xs text-muted">Choose a country first.</p>
        )}
      </div>
      {/* Already-verified members never see these — nothing left to verify,
          so re-showing (and requiring) a license number or document on a
          routine profile edit would just be friction. They stay visible for
          first-time onboarding and for a rejected member's resubmission,
          since both are still verified === false. Hidden outright while
          LICENSE_VERIFICATION_ENABLED is off (see src/lib/verification.ts). */}
      {LICENSE_VERIFICATION_ENABLED && !profile.verified && (
        <>
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
        </>
      )}
      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton disabled={convertingAvatar} pending={isPending}>
        Save profile
      </SubmitButton>
    </form>
  );
}
