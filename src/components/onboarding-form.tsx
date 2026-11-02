"use client";

import { useEffect, useState, useTransition } from "react";
import {
  checkHandleAction,
  updateProfileAction,
  type HandleAvailability,
  type ProfileFormState,
} from "@/app/actions/profile";
import { ROLE_GROUPS, roleGroupFor, roleGroupLabel, roleOptionLabel, ROLES, type RoleGroup } from "@/lib/roles";
import { t } from "@/lib/i18n";
import { COUNTRIES, countryName } from "@/lib/countries";
import { citiesForCountry } from "@/lib/cities";
import { SPECIALTIES } from "@/lib/specialties";
import { toUploadableImage } from "@/lib/heic";
import { Avatar } from "@/components/avatar";
import { AvatarCropper } from "@/components/avatar-cropper";
import {
  CapsuleSubmit,
  FormError,
  GroupFooter,
  GroupHeader,
  GroupedList,
  InputRow,
  PictureTile,
  SegmentedControl,
  SelectRow,
} from "@/components/ui/ios";
import type { Locale, Profile } from "@/lib/database.types";

/** "Jane Doe, PharmD" → "jane_doe" — a starting point the member can edit. */
function suggestHandle(fullName: string | null): string {
  return (fullName ?? "")
    .split(",")[0]
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

function HandleStatus({ status, locale }: { status: HandleAvailability | "checking" | null; locale: Locale }) {
  if (status === "available") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" role="img" aria-label={t(locale, "onboarding.handleAvailable")} className="shrink-0 text-positive">
        <circle cx="12" cy="12" r="11" fill="currentColor" />
        <path d="m7 12.3 3.3 3.2L17 8.8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "taken") {
    return <span className="shrink-0 text-[13px] font-medium text-danger">{t(locale, "onboarding.handleTaken")}</span>;
  }
  return null;
}

export function OnboardingForm({
  profile,
  isEdit,
  locale,
  children,
}: {
  profile: Profile;
  isEdit: boolean;
  locale: Locale;
  /** Extra rows shown under the form on Edit Profile (interests, verification). */
  children?: React.ReactNode;
}) {
  const [state, setState] = useState<ProfileFormState>(undefined);
  const [isPending, startTransition] = useTransition();

  // --- Photo (pick → optional HEIC conversion → crop) ---
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  // The cropped photo to upload, held directly rather than pushed back into
  // the file input's .files — WebKit's support for writing .files via a
  // DataTransfer is inconsistent and silently broke uploads before, so
  // handleSubmit sets it on the FormData instead.
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [convertingAvatar, setConvertingAvatar] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);

  // --- Handle ---
  const [handle, setHandle] = useState(profile.handle ?? suggestHandle(profile.full_name));
  // Result of the last live availability check, keyed by the handle it was
  // for, so the badge never shows a stale answer for a different value.
  const [checked, setChecked] = useState<{ handle: string; result: HandleAvailability } | null>(null);
  const normalizedHandle = handle.trim().toLowerCase();
  const handleNeedsCheck =
    normalizedHandle.length >= 3 && !(profile.handle && normalizedHandle === profile.handle);
  const handleStatus: HandleAvailability | "checking" | null = !handleNeedsCheck
    ? null
    : checked?.handle === normalizedHandle
      ? checked.result
      : "checking";

  // --- Role: picture tile first, then the exact title inside it ---
  const storedRoleIsListed = ROLES.includes(profile.role as (typeof ROLES)[number]);
  const [group, setGroup] = useState<RoleGroup | null>(roleGroupFor(profile.role));
  const [role, setRole] = useState<string>(
    profile.role ? (storedRoleIsListed ? profile.role : "Other") : "",
  );
  const [roleOther, setRoleOther] = useState(profile.role && !storedRoleIsListed ? profile.role : "");

  // --- Location ---
  const [countryCode, setCountryCode] = useState(profile.country_code ?? "");
  const availableCities = citiesForCountry(countryCode);
  const isCustomCity = Boolean(profile.city) && !availableCities.includes(profile.city!);
  const [cityValue, setCityValue] = useState(isCustomCity ? "__other__" : (profile.city ?? ""));
  const [cityOther, setCityOther] = useState(isCustomCity ? (profile.city ?? "") : "");

  useEffect(() => {
    if (!handleNeedsCheck) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkHandleAction(normalizedHandle);
      if (!cancelled) setChecked({ handle: normalizedHandle, result });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalizedHandle, handleNeedsCheck]);

  function pickGroup(next: RoleGroup) {
    setGroup(next);
    // One option (Dentist): that's the role. Otherwise keep the current
    // pick if it belongs to this group, else wait for the member to choose.
    if (next.options.length === 1) setRole(next.options[0].role);
    else if (!next.options.some((o) => o.role === role)) setRole("");
  }

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

  function handleSubmit(formData: FormData) {
    if (avatarFile) formData.set("avatar", avatarFile, avatarFile.name);
    startTransition(async () => {
      const result = await updateProfileAction(state, formData);
      setState(result);
    });
  }

  const hasPhoto = Boolean(avatarPreview ?? profile.avatar_url);
  const segmented = group && group.options.length > 1 && group.options.length <= 4;
  const picker = group && group.options.length > 4;

  return (
    <form action={handleSubmit} className="flex flex-1 flex-col">
      <input type="hidden" name="role" value={role} />
      {!isEdit && <input type="hidden" name="setup" value="1" />}

      <div className="flex items-center gap-3.5">
        <label className="flex shrink-0 cursor-pointer flex-col items-center gap-1.5">
          <Avatar avatarUrl={avatarPreview ?? profile.avatar_url} name={profile.full_name} size="lg" />
          <span className="text-[13px] font-semibold text-accent-2">
            {convertingAvatar
              ? t(locale, "onboarding.converting")
              : t(locale, hasPhoto ? "onboarding.changePhoto" : "onboarding.addPhoto")}
          </span>
          {/* No name — this only feeds the crop step; handleSubmit sets the
              cropped file on the FormData itself. */}
          <input type="file" accept="image/*,.heic,.heif" className="sr-only" onChange={handleAvatarChange} />
        </label>
        <GroupedList className="flex-1">
          <InputRow
            label={t(locale, "onboarding.name")}
            labelWidth={64}
            name="full_name"
            defaultValue={profile.full_name ?? ""}
            placeholder={t(locale, "onboarding.namePlaceholder")}
            autoComplete="name"
            required
          />
          <InputRow
            label={t(locale, "onboarding.handle")}
            labelWidth={64}
            name="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="jane_pharmd"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            minLength={3}
            required
            dir="ltr"
            trailing={<HandleStatus status={handleStatus} locale={locale} />}
          />
        </GroupedList>
      </div>
      {cropSource && (
        <AvatarCropper imageSrc={cropSource} onCancel={handleCropCancel} onCropped={handleCropped} locale={locale} />
      )}

      <GroupHeader>{t(locale, "onboarding.role")}</GroupHeader>
      <div className="grid grid-cols-3 gap-2">
        {ROLE_GROUPS.map((g) => (
          <PictureTile
            key={g.id}
            label={roleGroupLabel(g, locale)}
            art={g.art}
            tint={g.tint}
            selected={group?.id === g.id}
            onClick={() => pickGroup(g)}
          />
        ))}
      </div>

      {segmented && (
        <div className="mt-3">
          <SegmentedControl
            label={t(locale, "onboarding.roleType", { group: roleGroupLabel(group, locale) })}
            options={group.options.map((o) => ({ value: o.role, label: roleOptionLabel(o, locale) }))}
            value={role || null}
            onChange={setRole}
          />
        </div>
      )}

      {(picker || role === "Other") && (
        <GroupedList className="mt-3">
          {picker && (
            <SelectRow
              label={t(locale, "onboarding.title")}
              placeholder={t(locale, "flow.choose")}
              display={(() => {
                const picked = group.options.find((o) => o.role === role);
                return picked ? roleOptionLabel(picked, locale) : null;
              })()}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="" disabled>
                {t(locale, "flow.choose")}
              </option>
              {group.options.map((o) => (
                <option key={o.role} value={o.role}>
                  {roleOptionLabel(o, locale)}
                </option>
              ))}
            </SelectRow>
          )}
          {role === "Other" && (
            <InputRow
              label={t(locale, "onboarding.yourRole")}
              labelWidth={96}
              name="role_other"
              value={roleOther}
              onChange={(e) => setRoleOther(e.target.value)}
              placeholder={t(locale, "onboarding.yourRolePlaceholder")}
              required
            />
          )}
        </GroupedList>
      )}

      <GroupedList className="mt-4">
        <InputRow
          label={t(locale, "onboarding.specialty")}
          labelWidth={96}
          name="specialty"
          list="specialty-options"
          defaultValue={profile.specialty ?? ""}
          placeholder={t(locale, "flow.optional")}
        />
        <SelectRow
          label={t(locale, "onboarding.country")}
          name="country_code"
          display={countryName(countryCode)}
          placeholder={t(locale, "onboarding.preferNotToSay")}
          value={countryCode}
          onChange={(e) => {
            setCountryCode(e.target.value);
            setCityValue("");
          }}
        >
          <option value="">{t(locale, "onboarding.preferNotToSay")}</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </SelectRow>
        <SelectRow
          label={t(locale, "onboarding.city")}
          name="city"
          display={cityValue === "__other__" ? t(locale, "onboarding.cityOther") : cityValue || null}
          placeholder={t(locale, countryCode ? "flow.optional" : "onboarding.chooseCountryFirst")}
          value={cityValue}
          disabled={!countryCode}
          onChange={(e) => setCityValue(e.target.value)}
        >
          <option value="">{t(locale, "onboarding.preferNotToSay")}</option>
          {availableCities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value="__other__">{t(locale, "onboarding.cityOtherOption")}</option>
        </SelectRow>
        {cityValue === "__other__" && (
          <InputRow
            label={t(locale, "onboarding.cityName")}
            labelWidth={96}
            name="city_other"
            value={cityOther}
            onChange={(e) => setCityOther(e.target.value)}
            placeholder={t(locale, "onboarding.cityNamePlaceholder")}
          />
        )}
      </GroupedList>
      <datalist id="specialty-options">
        {SPECIALTIES.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <GroupFooter>{t(locale, "onboarding.countryFooter")}</GroupFooter>

      {children}

      {state?.error && <FormError>{state.error}</FormError>}

      <div className="mt-auto pt-8">
        <CapsuleSubmit
          pending={isPending}
          disabled={!role || handleStatus === "taken"}
          pendingLabel={t(locale, "flow.pleaseWait")}
        >
          {t(locale, isEdit ? "flow.save" : "flow.continue")}
        </CapsuleSubmit>
      </div>
    </form>
  );
}
