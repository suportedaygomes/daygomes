export const USER_ROLES = ["membro", "corretor", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const DEFAULT_USER_PASSWORD = "daygomes";

export const ROLE_LABELS: Record<UserRole, string> = {
  membro: "Membro",
  corretor: "Corretor",
  admin: "Admin",
};

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}
