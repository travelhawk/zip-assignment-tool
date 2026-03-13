export const DEFAULT_ADMIN_ENTRA_ROLE_VALUES = [
  "Assignment.Import",
  "Admin",
] as const;

function normalizeRoleName(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue || null;
}

function readRolesValue(source: unknown): unknown[] {
  if (Array.isArray(source)) {
    return source;
  }

  if (typeof source === "string") {
    return [source];
  }

  if (!source || typeof source !== "object") {
    return [];
  }

  const roles = (source as Record<string, unknown>).roles;

  if (Array.isArray(roles)) {
    return roles;
  }

  return typeof roles === "string" ? [roles] : [];
}

export function extractEntraRoles(source: unknown) {
  return Array.from(
    new Set(
      readRolesValue(source)
        .map((role) => normalizeRoleName(role))
        .filter((role): role is string => Boolean(role)),
    ),
  );
}

export function hasEntraRole(source: unknown, roleName: string) {
  const normalizedRoleName = normalizeRoleName(roleName);

  if (!normalizedRoleName) {
    return false;
  }

  return extractEntraRoles(source).includes(normalizedRoleName);
}

export function hasAnyEntraRole(source: unknown, roleNames: readonly string[]) {
  const roles = extractEntraRoles(source);

  return roleNames.some((roleName) => {
    const normalizedRoleName = normalizeRoleName(roleName);
    return normalizedRoleName ? roles.includes(normalizedRoleName) : false;
  });
}

export function isAdminEntraUser(
  source: unknown,
  adminRoleValues: readonly string[] = DEFAULT_ADMIN_ENTRA_ROLE_VALUES,
) {
  return hasAnyEntraRole(source, adminRoleValues);
}
