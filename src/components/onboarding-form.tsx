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

export function OnboardingForm({ profile }: { profile: Profile }) {
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
          className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
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
          className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
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
      />
      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton disabled={convertingAvatar}>Save profile</SubmitButton>
    </form>
  );
}
