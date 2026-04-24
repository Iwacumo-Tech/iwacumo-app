export const ACTIVE_PROFILE_COOKIE = "iwacumo_active_profile";

export type DashboardProfile = "staff" | "publisher" | "author" | "reader";

export const PROFILE_LABELS: Record<DashboardProfile, string> = {
  staff: "Staff Profile",
  publisher: "Publisher Profile",
  author: "Author Profile",
  reader: "Reader Profile",
};

export function normalizeProfile(value?: string | null): DashboardProfile | null {
  if (value === "staff" || value === "publisher" || value === "author" || value === "reader") {
    return value;
  }

  return null;
}

export function resolveDefaultActiveProfile(
  availableProfiles: DashboardProfile[]
): DashboardProfile | null {
  const priority: DashboardProfile[] = ["publisher", "author", "reader", "staff"];
  return priority.find((profile) => availableProfiles.includes(profile)) ?? null;
}

export function resolveActiveProfile(
  availableProfiles: DashboardProfile[],
  requestedProfile?: string | null
): DashboardProfile | null {
  const normalized = normalizeProfile(requestedProfile);

  if (normalized && availableProfiles.includes(normalized)) {
    return normalized;
  }

  return resolveDefaultActiveProfile(availableProfiles);
}

export function getRolesForActiveProfile(
  activeProfile: DashboardProfile | null,
  roleNames: string[]
) {
  if (activeProfile === "reader") return ["customer"];
  if (activeProfile === "author") return ["author"];
  if (activeProfile === "publisher") return ["publisher"];
  if (activeProfile === "staff") {
    return roleNames.filter((role) =>
      role === "super-admin"
      || role.startsWith("staff-")
      || role === "tenant-admin"
    );
  }

  return roleNames;
}

export function setActiveProfileCookie(profile: DashboardProfile) {
  if (typeof document === "undefined") return;

  document.cookie = `${ACTIVE_PROFILE_COOKIE}=${profile}; path=/; max-age=31536000; SameSite=Lax`;
}
