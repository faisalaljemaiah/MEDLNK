"use client";

import { useActionState } from "react";
import { updateProfileAction, ROLES } from "@/app/actions/profile";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Profile } from "@/lib/database.types";

export function OnboardingForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfileAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
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
      <SubmitButton>Save profile</SubmitButton>
    </form>
  );
}
